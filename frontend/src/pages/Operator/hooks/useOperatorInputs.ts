import type { CutInputData, QuantityInputData } from "../types/cutInput";
import type { OperatorInputField } from "../types/inputFields";
import {
  clearOperatorCutValidationErrors,
  clearOperatorFieldError,
  clearOperatorPauseReasonError,
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

/**
 * Hook for managing operator input changes and calculations
 */
export const useOperatorInputs = (
  _cutInputs: Map<number | string, CutInputData>,
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>,
  idleTimeConfigs: Map<string, number>,
  validationErrors: Map<number | string, Record<string, Record<string, string>>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>
) => {
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
          // Each quantity keeps independent timer/pause state
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

      // Clear field-level validation errors after mass apply.
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
      
      // Handle idle/resume toggle
      if (field === "togglePause") {
        const now = Date.now();
        if (qtyData.isPaused) {
          // Resuming: calculate idle duration and add to sessions
          // Require idle reason before resuming
          if (!qtyData.currentPauseReason || qtyData.currentPauseReason.trim() === "") {
            if (setValidationErrors) setOperatorPauseReasonError(setValidationErrors, cutId, quantityIndex);
            return newMap;
          }
          
          if (qtyData.pauseStartTime) {
            if (setValidationErrors) clearOperatorPauseReasonError(setValidationErrors, cutId, quantityIndex);
            quantities[quantityIndex] = resumePausedQuantity(qtyData, now);
            newMap.set(cutId, { ...current, quantities });
            return newMap;
          }
        } else {
          quantities[quantityIndex] = pauseRunningQuantity(qtyData, now);
          newMap.set(cutId, { ...current, quantities });
          return newMap;
        }
        return newMap;
      }
      
      // Handle idle reason update
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

      // Handle reset - reset timer, idle data, and clear start/end times to allow recalculation
      if (field === "resetTimer") {
        quantities[quantityIndex] = buildResetQuantityState(qtyData);
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      
      // Handle end time - can only be set once
      if (field === "endTime" && qtyData.endTime) {
        // End time already set, don't allow changes
        return newMap;
      }
      
      const updatedQtyData: QuantityInputData = {
        ...qtyData,
        ...(field !== "recalculateMachineHrs" && field !== "addIdleTimeToMachineHrs" ? { [field]: value } : {}),
      } as QuantityInputData;

      if (field === "startTime") {
        updatedQtyData.startTimeEpochMs = null;
      }
      if (field === "endTime") {
        updatedQtyData.endTimeEpochMs = null;
      }

      // If idleTime is changed to "Vertical Dial" and config exists, set duration
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedQtyData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      
      // Auto-calculate machine hours when start time or end time changes
      // Account for idle time in calculation
      if (field === "startTime" || field === "endTime") {
        if (field === "endTime" && typeof value === "string" && value && qtyData.isPaused && qtyData.pauseStartTime) {
          Object.assign(updatedQtyData, closePauseOnEndTime(updatedQtyData, Date.now()));
        }

        if (updatedQtyData.startTime && updatedQtyData.endTime) Object.assign(updatedQtyData, updateQuantityMachineHours(updatedQtyData, "auto"));
      }
      
      // Add idle time to machine hours when icon is clicked
      if (field === "addIdleTimeToMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime && updatedQtyData.idleTimeDuration) {
          Object.assign(updatedQtyData, updateQuantityMachineHours(updatedQtyData, "add_idle"));
        }
      }
      
      // Recalculate machine hours when icon is clicked (legacy support)
      // Account for idle time in calculation
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
      
      // Clear error for this field when user starts typing
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
