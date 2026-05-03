import { useCallback } from "react";
import { completeOperatorProductionLog } from "../../../services/employeeLogsApi";
import { captureOperatorInput, updateOperatorJob, updateOperatorQaStatus } from "../../../services/operatorApi";
import type { CutInputData } from "../types/cutInput";
import type { JobEntry, QuantityQaStatus } from "../../../types/job";
import { readImageFileAsBase64, showAndHideToast } from "../utils/operatorViewActionUtils";
import { applyQaStatusToQuantities, buildRangeCapturePayload, buildSingleCapturePayload, getAssignedToValue, getOperatorOpsName } from "../utils/operatorCapturePayloads";
import { validateQuantityInputs, validateRangeSelection } from "../utils/validation";

type Params = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  activeOperatorLogIds: Map<string, string>;
  resolveActiveOperatorLogId: (cutId: number | string, quantityIndex: number) => Promise<string | undefined>;
  setActiveOperatorLogIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setSavedQuantities: React.Dispatch<React.SetStateAction<Map<number | string, Set<number>>>>;
  setSavedRanges: React.Dispatch<React.SetStateAction<Map<number | string, Set<string>>>>;
  setQaStatusesByCut: React.Dispatch<React.SetStateAction<Map<number | string, Record<number, any>>>>;
  setSaveToast: React.Dispatch<React.SetStateAction<any>>;
  setActionToast: React.Dispatch<React.SetStateAction<any>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>;
  ensureCurrentUserAssigned: (job: JobEntry | undefined) => boolean;
  clearQuantityErrors: (cutId: number | string, quantityIndex: number) => void;
};

export const useOperatorPersistenceActions = ({
  jobs,
  cutInputs,
  activeOperatorLogIds,
  resolveActiveOperatorLogId,
  setActiveOperatorLogIds,
  setSavedQuantities,
  setSavedRanges,
  setQaStatusesByCut,
  setSaveToast,
  setActionToast,
  setValidationErrors,
  ensureCurrentUserAssigned,
  clearQuantityErrors,
}: Params) => {
  const handleSaveQuantity = useCallback(async (cutId: number | string, quantityIndex: number) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData?.quantities?.[quantityIndex]) {
      showAndHideToast(setSaveToast, "No data to save for this quantity.", "error", 3000);
      return;
    }
    const qtyData = cutData.quantities[quantityIndex];
    const errors = validateQuantityInputs(qtyData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => new Map(prev).set(cutId, { ...(prev.get(cutId) || {}), [quantityIndex]: errors }));
      showAndHideToast(setSaveToast, "Please fix validation errors before saving.", "error", 3000);
      return;
    }

    try {
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) imageBase64 = await readImageFileAsBase64(qtyData.lastImageFile);
      const opsName = getOperatorOpsName(qtyData.opsName);
      const activeLogId = activeOperatorLogIds.get(`${String(cutId)}:${quantityIndex}`) || await resolveActiveOperatorLogId(cutId, quantityIndex);
      const payload = buildSingleCapturePayload(qtyData, imageBase64, quantityIndex, activeLogId);

      try {
        await captureOperatorInput(String(cutId), payload);
      } catch (error: any) {
        if (!error?.message?.includes("overlaps")) throw error;
      }

      await updateOperatorJob(String(cutId), {
        assignedTo: getAssignedToValue(opsName),
        machineNumber: String(qtyData.machineNumber || "").trim(),
      });
      setSavedQuantities((prev) => {
        const next = new Map(prev);
        const saved = next.get(cutId) || new Set<number>();
        saved.add(quantityIndex);
        next.set(cutId, saved);
        return next;
      });
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        next.set(cutId, { ...(next.get(cutId) || {}), [quantityIndex + 1]: (next.get(cutId) || {})[quantityIndex + 1] || "SAVED" });
        return next;
      });
      clearQuantityErrors(cutId, quantityIndex);
      showAndHideToast(setSaveToast, `Quantity ${quantityIndex + 1} saved successfully!`, "success", 2000);
      setActiveOperatorLogIds((prev) => {
        const next = new Map(prev);
        next.delete(`${String(cutId)}:${quantityIndex}`);
        return next;
      });
    } catch (error) {
      console.error("Failed to save quantity", error);
      showAndHideToast(setSaveToast, "Failed to save quantity. Please try again.", "error", 3000);
    }
  }, [activeOperatorLogIds, clearQuantityErrors, cutInputs, resolveActiveOperatorLogId, setActiveOperatorLogIds, setQaStatusesByCut, setSaveToast, setSavedQuantities, setValidationErrors]);

  const handleSaveRange = useCallback(async (cutId: number | string, sourceQuantityIndex: number, fromQty: number, toQty: number) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData?.quantities?.[sourceQuantityIndex]) {
      showAndHideToast(setSaveToast, "No data to save for selected range.", "error", 3000);
      return;
    }
    const job = jobs.find((item) => String(item.id) === String(cutId));
    const totalQuantity = Math.max(1, Number(job?.qty || 1));
    const rangeError = validateRangeSelection(totalQuantity, fromQty, toQty);
    if (rangeError) {
      showAndHideToast(setSaveToast, rangeError, "error", 3000);
      return;
    }

    const qtyData = cutData.quantities[sourceQuantityIndex];
    const errors = validateQuantityInputs(qtyData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => new Map(prev).set(cutId, { ...(prev.get(cutId) || {}), [sourceQuantityIndex]: errors }));
      showAndHideToast(setSaveToast, "Please fix validation errors before saving range.", "error", 3000);
      return;
    }

    try {
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) imageBase64 = await readImageFileAsBase64(qtyData.lastImageFile);
      const opsName = getOperatorOpsName(qtyData.opsName);
      const activeLogId = activeOperatorLogIds.get(`${String(cutId)}:${sourceQuantityIndex}`) || await resolveActiveOperatorLogId(cutId, sourceQuantityIndex);
      await captureOperatorInput(String(cutId), buildRangeCapturePayload(qtyData, imageBase64, sourceQuantityIndex, fromQty, toQty, activeLogId));
      await updateOperatorJob(String(cutId), {
        assignedTo: getAssignedToValue(opsName),
        machineNumber: String(qtyData.machineNumber || "").trim(),
      });
      setSavedRanges((prev) => {
        const next = new Map(prev);
        const saved = next.get(cutId) || new Set<string>();
        saved.add(`${fromQty}-${toQty}`);
        next.set(cutId, saved);
        return next;
      });
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        next.set(cutId, applyQaStatusToQuantities(next.get(cutId) || {}, Array.from({ length: toQty - fromQty + 1 }, (_, idx) => fromQty + idx), "SAVED"));
        return next;
      });
      showAndHideToast(setSaveToast, `Range ${fromQty}-${toQty} saved successfully!`, "success", 2000);
      setActiveOperatorLogIds((prev) => {
        const next = new Map(prev);
        next.delete(`${String(cutId)}:${sourceQuantityIndex}`);
        return next;
      });
    } catch (error: any) {
      console.error("Failed to save range", error);
      showAndHideToast(setSaveToast, error?.message?.includes("overlaps") ? "Selected quantity/range already has captured data. Once captured, it cannot be replaced." : "Failed to save range. Please try again.", "error", 3000);
    }
  }, [activeOperatorLogIds, cutInputs, jobs, resolveActiveOperatorLogId, setActiveOperatorLogIds, setQaStatusesByCut, setSaveToast, setSavedRanges, setValidationErrors]);

  const handleUpdateQaStatus = useCallback(async (cutId: number | string, quantityNumbers: number[], status: QuantityQaStatus) => {
    if (!quantityNumbers.length) return;
    try {
      await updateOperatorQaStatus(String(cutId), {
        quantityNumbers,
        status: status === "SENT_TO_QA" ? "SENT_TO_QA" : "READY_FOR_QA",
      });
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        next.set(cutId, applyQaStatusToQuantities(next.get(cutId) || {}, quantityNumbers, status));
        return next;
      });
      showAndHideToast(setActionToast, `${status === "SENT_TO_QA" ? "Sent to QC" : "Marked Ready for QC"}: Qty ${quantityNumbers.join(", ")}`, "success");
    } catch (error) {
      console.error("Failed to update QC status", error);
      showAndHideToast(setActionToast, "Failed to update QC status.", "error");
    }
  }, [setActionToast, setQaStatusesByCut]);

  const handleEndTimeCaptured = useCallback(async (
    cutId: number | string,
    quantityIndex: number,
    options: { timestampMs: number; endTime: string; machineHrs: string; idleTime: string; idleTimeDuration: string; }
  ) => {
    const cutData = cutInputs.get(cutId);
    const qtyData = cutData?.quantities?.[quantityIndex];
    if (!qtyData) {
      showAndHideToast(setActionToast, "No quantity data found.", "error", 3000);
      return false;
    }
    if (qtyData.isPaused) {
      showAndHideToast(setActionToast, "Resume this quantity before capturing end time.", "error", 3000);
      return false;
    }

    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) {
      showAndHideToast(setActionToast, "Job not found.", "error", 3000);
      return false;
    }
    if (!ensureCurrentUserAssigned(job)) return false;

    const key = `${String(cutId)}:${quantityIndex}`;
    const logId = activeOperatorLogIds.get(key) || await resolveActiveOperatorLogId(cutId, quantityIndex);
    const machineNumber = String(qtyData.machineNumber || "").trim();
    const opsName = getOperatorOpsName(qtyData.opsName);

    try {
      if (logId) {
        const completedLog = await completeOperatorProductionLog({
          logId,
          status: "COMPLETED",
          endedAt: new Date(options.timestampMs).toISOString(),
          machineNumber,
          opsName,
          machineHrs: options.machineHrs,
          idleTime: options.idleTime,
          idleTimeDuration: options.idleTimeDuration,
          pauseSessions: qtyData.pauseSessions || [],
        });

        const completedLogId = String((completedLog as any)?._id || (completedLog as any)?.id || logId);
        setActiveOperatorLogIds((prev) => {
          const next = new Map(prev);
          next.set(key, completedLogId);
          return next;
        });
      }

      await updateOperatorJob(String(cutId), {
        endTime: options.endTime,
        machineHrs: options.machineHrs,
        idleTime: "",
        idleTimeDuration: "",
      });

      return true;
    } catch (error) {
      console.error("Failed to complete operator run", error);
      const message = error instanceof Error ? error.message : "Failed to capture end time.";
      showAndHideToast(setActionToast, message, "error", 3500);
      return false;
    }
  }, [activeOperatorLogIds, cutInputs, ensureCurrentUserAssigned, jobs, resolveActiveOperatorLogId, setActionToast, setActiveOperatorLogIds]);

  return {
    handleSaveQuantity,
    handleSaveRange,
    handleUpdateQaStatus,
    handleEndTimeCaptured,
  };
};
