import type { CutInputData, QuantityInputData } from "../types/cutInput";
import type { OperatorInputField } from "../types/inputFields";
import {
  clearOperatorCutValidationErrors,
  clearOperatorFieldError,
  clearOperatorPauseReasonError,
  setOperatorFieldError,
  setOperatorPauseReasonError,
} from "../utils/operatorInputErrors";
import { applyOperatorCutImage, readOperatorImageAsDataUrl } from "../utils/operatorInputMedia";
import { closePauseOnEndTime, pauseRunningQuantity, resumePausedQuantity } from "../utils/operatorPauseState";
import {
  buildCopiedQuantityFields,
  buildResetQuantityState,
  ensureCutInputState,
  updateQuantityMachineHours,
} from "../utils/operatorInputState";
import { getPrimaryPersonName } from "../../../utils/jobFormatting";

export const useOperatorInputs = (
  _cutInputs: Map<number | string, CutInputData>,
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>,
  idleTimeConfigs: Map<string, number>,
  validationErrors: Map<number | string, Record<string, Record<string, string>>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  currentUserDisplayName: string
) => {
  const normalizeOperatorList = (values: unknown[]): string[] => {
    const seen = new Set<string>();
    return values
      .map((value) => getPrimaryPersonName(value, ""))
      .filter((value) => {
        if (!value) return false;
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const copyQuantityToAll = (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const { cut: current, quantities } = ensureCutInputState(newMap.get(cutId), totalQuantity);
      const source = quantities[sourceQuantityIndex];
      if (!source) return newMap;
      const copiedFields = buildCopiedQuantityFields(source);
      for (let i = 0; i < totalQuantity; i += 1) {
        quantities[i] = {
          ...quantities[i],
          ...copiedFields,
          isPaused: false,
          pauseStartTime: null,
          totalPauseTime: 0,
          pausedElapsedTime: 0,
          pauseSessions: [],
          currentPauseReason: "",
        };
      }

      newMap.set(cutId, {
        ...current,
        quantities,
      });
      if (setValidationErrors) clearOperatorCutValidationErrors(setValidationErrors, cutId);
      return newMap;
    });
  };

  const copyQuantityToCount = (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number,
    quantityCount: number
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const { cut: current, quantities } = ensureCutInputState(newMap.get(cutId), totalQuantity);
      const source = quantities[sourceQuantityIndex];
      if (!source) return newMap;
      const safeCount = Math.max(1, Math.floor(quantityCount));
      const targetEndIndex = Math.min(totalQuantity, sourceQuantityIndex + safeCount);
      const copiedFields = buildCopiedQuantityFields(source);
      for (let i = sourceQuantityIndex; i < targetEndIndex; i += 1) {
        quantities[i] = {
          ...quantities[i],
          ...copiedFields,
          isPaused: false,
          pauseStartTime: null,
          totalPauseTime: 0,
          pausedElapsedTime: 0,
          pauseSessions: [],
          currentPauseReason: "",
        };
      }

      newMap.set(cutId, {
        ...current,
        quantities,
      });
      if (setValidationErrors) clearOperatorCutValidationErrors(setValidationErrors, cutId);
      return newMap;
    });
  };

  const handleCutImageChange = async (cutId: number | string, files: File[]) => {
    if (files.length === 0) {
      applyOperatorCutImage(setCutInputs, cutId, null, null);
      return;
    }

    const file = files[0];
    const image = await readOperatorImageAsDataUrl(file);
    applyOperatorCutImage(setCutInputs, cutId, image, file);
  };

  const handleInputChange = (
    cutId: number | string,
    quantityIndex: number,
    field: OperatorInputField,
    value: string | string[]
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const { cut: current, quantities } = ensureCutInputState(newMap.get(cutId), Math.max(1, quantityIndex + 1));
      const qtyData = quantities[quantityIndex];
      const tryResumePausedQuantity = (now: number): boolean => {
        if (!qtyData.currentPauseReason || qtyData.currentPauseReason.trim() === "") {
          if (setValidationErrors) setOperatorPauseReasonError(setValidationErrors, cutId, quantityIndex);
          return false;
        }

        const selectedOps = Array.isArray(qtyData.opsName)
          ? qtyData.opsName.map((name) => String(name || "").trim()).filter(Boolean)
          : [];
        const normalizedCurrentUser = String(currentUserDisplayName || "").trim().toLowerCase();
        const hasCurrentUserName =
          !normalizedCurrentUser ||
          selectedOps.some((name) => name.toLowerCase() === normalizedCurrentUser);

        if (!selectedOps.length || !hasCurrentUserName) {
          if (setValidationErrors) {
            setOperatorFieldError(
              setValidationErrors,
              cutId,
              quantityIndex,
              "opsName",
              normalizedCurrentUser
                ? `Add ${currentUserDisplayName} in Ops Name before resuming`
                : "Select Ops Name before resuming"
            );
          }
          return false;
        }

        if (!String(qtyData.machineNumber || "").trim()) {
          if (setValidationErrors) {
            setOperatorFieldError(
              setValidationErrors,
              cutId,
              quantityIndex,
              "machineNumber",
              "Select machine number before resuming"
            );
          }
          return false;
        }

        if (!qtyData.pauseStartTime) return false;

        if (setValidationErrors) clearOperatorPauseReasonError(setValidationErrors, cutId, quantityIndex);
        if (setValidationErrors) clearOperatorFieldError(validationErrors, setValidationErrors, cutId, quantityIndex, "opsName");
        if (setValidationErrors) clearOperatorFieldError(validationErrors, setValidationErrors, cutId, quantityIndex, "machineNumber");
        quantities[quantityIndex] = resumePausedQuantity(qtyData, now, currentUserDisplayName);
        newMap.set(cutId, { ...current, quantities });
        return true;
      };

      if (field === "togglePause") {
        const now = Date.now();
        if (qtyData.isPaused) {
          if (qtyData.currentPauseReason === "Shift Over") {
            return newMap;
          }
          if (tryResumePausedQuantity(now)) return newMap;
        } else {
          quantities[quantityIndex] = pauseRunningQuantity(qtyData, now);
          newMap.set(cutId, { ...current, quantities });
          return newMap;
        }
        return newMap;
      }
      if (field === "markShiftOver") {
        if (!qtyData.startTime || qtyData.endTime) return newMap;
        const now = Date.now();
        if (qtyData.isPaused) {
          if (qtyData.currentPauseReason !== "Shift Over") return newMap;
          if (tryResumePausedQuantity(now)) return newMap;
          return newMap;
        }
        const paused = pauseRunningQuantity(qtyData, now);
        quantities[quantityIndex] = {
          ...paused,
          currentPauseReason: "Shift Over",
        };
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      if (field === "pauseReason") {
        const updatedQtyData: QuantityInputData = {
          ...qtyData,
          currentPauseReason: value as string,
        };
        quantities[quantityIndex] = updatedQtyData;
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      
      if (field === "startTimeEpochMs" || field === "endTimeEpochMs") {
        const parsed = typeof value === "string" && value.trim() ? Number(value) : null;
        const numericValue = Number.isFinite(parsed as number) ? (parsed as number) : null;
        const updatedQtyData: QuantityInputData = {
          ...qtyData,
          [field]: numericValue,
        } as QuantityInputData;
        quantities[quantityIndex] = updatedQtyData;
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      if (field === "resetTimer") {
        quantities[quantityIndex] = buildResetQuantityState(qtyData);
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      if (field === "endTime" && qtyData.endTime) {
        return newMap;
      }
      const updatedQtyData: QuantityInputData = {
        ...qtyData,
        ...(field !== "recalculateMachineHrs" && field !== "addIdleTimeToMachineHrs" ? { [field]: value } : {}),
      } as QuantityInputData;

      if (field === "opsName") {
        const nextOps = Array.isArray(value)
          ? value.map((name) => getPrimaryPersonName(name, "")).filter(Boolean)
          : (String(value || "").trim() ? [getPrimaryPersonName(value, "")] : []);
        updatedQtyData.opsName = nextOps;
        updatedQtyData.operatorHistory = normalizeOperatorList([
          ...(qtyData.operatorHistory || []),
          ...(qtyData.opsName || []),
          ...nextOps,
        ]);
      }

      if (field === "startTime") {
        updatedQtyData.startTimeEpochMs = null;
      }
      if (field === "endTime") {
        updatedQtyData.endTimeEpochMs = null;
      }
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedQtyData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      if (field === "startTime" || field === "endTime") {
        if (field === "endTime" && typeof value === "string" && value && qtyData.isPaused && qtyData.pauseStartTime) {
          Object.assign(updatedQtyData, closePauseOnEndTime(updatedQtyData, Date.now(), currentUserDisplayName));
        }
        if (updatedQtyData.startTime && updatedQtyData.endTime) Object.assign(updatedQtyData, updateQuantityMachineHours(updatedQtyData, "auto"));
      }
      if (field === "addIdleTimeToMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime && updatedQtyData.idleTimeDuration) {
          Object.assign(updatedQtyData, updateQuantityMachineHours(updatedQtyData, "add_idle"));
        }
      }
      if (field === "recalculateMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime) {
          Object.assign(updatedQtyData, updateQuantityMachineHours(updatedQtyData, "recalculate"));
        }
      }
      quantities[quantityIndex] = updatedQtyData;
      newMap.set(cutId, {
        ...current,
        quantities,
      });
      if (field !== "recalculateMachineHrs") {
        clearOperatorFieldError(validationErrors, setValidationErrors, cutId, quantityIndex, field);
      }
      return newMap;
    });
  };

  return {
    handleCutImageChange,
    handleInputChange,
    copyQuantityToAll,
    copyQuantityToCount,
  };
};
