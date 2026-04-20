import { useCallback, useEffect, useMemo, useState } from "react";
import { completeOperatorProductionLog, getActiveOperatorRunLogs, startOperatorProductionLog } from "../../../services/employeeLogsApi";
import { captureOperatorInput, updateOperatorJob, updateOperatorQaStatus } from "../../../services/operatorApi";
import { validateQuantityInputs, validateRangeSelection } from "../utils/validation";
import { calculateTotals, type CutForm } from "../../Programmer/programmerUtils";
import type { CutInputData } from "../types/cutInput";
import type { JobEntry, QuantityQaStatus } from "../../../types/job";
import type { QuantityProgressStatus } from "../utils/qaProgress";
import { loadOperatorUsers, readImageFileAsBase64, seedQaStatusesByCut, seedSavedQuantities, showAndHideToast } from "../utils/operatorViewActionUtils";
import { createDefaultToast, type ToastState } from "../utils/operatorViewToast";
import { applyQaStatusToQuantities, buildRangeCapturePayload, buildSingleCapturePayload, getAssignedToValue, getOperatorOpsName } from "../utils/operatorCapturePayloads";

type Params = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>;
  currentUserDisplayName: string;
};

export const useOperatorViewActions = ({ jobs, cutInputs, setValidationErrors, currentUserDisplayName }: Params) => {
  const [operatorUsers, setOperatorUsers] = useState<Array<{ id: string | number; name: string }>>([]);
  const [savedQuantities, setSavedQuantities] = useState<Map<number | string, Set<number>>>(new Map());
  const [savedRanges, setSavedRanges] = useState<Map<number | string, Set<string>>>(new Map());
  const [qaStatusesByCut, setQaStatusesByCut] = useState<Map<number | string, Record<number, QuantityProgressStatus>>>(new Map());
  const [activeOperatorLogIds, setActiveOperatorLogIds] = useState<Map<string, string>>(new Map());
  const [saveToast, setSaveToast] = useState<ToastState>(() => createDefaultToast("success"));
  const [actionToast, setActionToast] = useState<ToastState>(() => createDefaultToast("info"));
  const [pendingDispatch, setPendingDispatch] = useState<{ cutId: number | string; quantityNumbers: number[] } | null>(null);
  const [pendingReset, setPendingReset] = useState<{ cutId: number | string; quantityIndex: number } | null>(null);

  useEffect(() => {
    void loadOperatorUsers().then(setOperatorUsers).catch((error) => console.error("Failed to fetch operators", error));
  }, []);

  useEffect(() => {
    if (!jobs.length) return;
    setQaStatusesByCut((prev) => {
      const next = new Map(prev);
      seedQaStatusesByCut(jobs).forEach((mapped, jobId) => {
        if (!next.has(jobId)) next.set(jobId, mapped);
      });
      return next;
    });
  }, [jobs]);

  useEffect(() => {
    if (!jobs.length) {
      setSavedQuantities(new Map());
      return;
    }
    const seeded = seedSavedQuantities(jobs);
    setSavedQuantities((prev) => {
      const merged = new Map(prev);
      seeded.forEach((set, cutId) => {
        const existing = merged.get(cutId) || new Set<number>();
        set.forEach((idx) => existing.add(idx));
        merged.set(cutId, existing);
      });
      return merged;
    });
  }, [jobs]);

  useEffect(() => {
    if (!jobs.length) {
      setActiveOperatorLogIds(new Map());
      return;
    }

    let isMounted = true;

    const syncActiveOperatorLogs = async () => {
      try {
        const activeLogs = await getActiveOperatorRunLogs();
        if (!isMounted) return;

        const currentJobIds = new Set(jobs.map((job) => String(job.id)));
        const nextMap = new Map<string, string>();

        activeLogs.forEach((log) => {
          if (log.endedAt) return;

          const jobId = String(log.jobId || "").trim();
          if (!jobId || !currentJobIds.has(jobId)) return;

          const fromQty = Math.max(1, Number(log.quantityFrom || 1));
          const toQty = Math.max(fromQty, Number(log.quantityTo || fromQty));
          for (let quantityNumber = fromQty; quantityNumber <= toQty; quantityNumber += 1) {
            nextMap.set(`${jobId}:${quantityNumber - 1}`, log._id);
          }
        });

        setActiveOperatorLogIds(nextMap);
      } catch {
        if (isMounted) {
          setActiveOperatorLogIds(new Map());
        }
      }
    };

    void syncActiveOperatorLogs();

    return () => {
      isMounted = false;
    };
  }, [jobs]);

  const resolveActiveOperatorLogId = useCallback(async (cutId: number | string, quantityIndex: number) => {
    const key = `${String(cutId)}:${quantityIndex}`;
    const existingLogId = activeOperatorLogIds.get(key);
    if (existingLogId) return existingLogId;

    const activeLogs = await getActiveOperatorRunLogs();

    const matchingLog = activeLogs.find((log) => {
      if (log.endedAt) return false;
      if (String(log.jobId || "").trim() !== String(cutId)) return false;
      const fromQty = Math.max(1, Number(log.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log.quantityTo || fromQty));
      const quantityNumber = quantityIndex + 1;
      return quantityNumber >= fromQty && quantityNumber <= toQty;
    });

    if (!matchingLog?._id) return undefined;

    setActiveOperatorLogIds((prev) => {
      const next = new Map(prev);
      next.set(key, matchingLog._id);
      return next;
    });

    return matchingLog._id;
  }, [activeOperatorLogIds]);

  const amounts = useMemo(() => {
    if (jobs.length === 0) return { perCut: [], totalWedmAmount: 0, totalSedmAmount: 0 };
    const totals = jobs.map((entry) => calculateTotals(entry as CutForm));
    return {
      perCut: totals.map((t) => ({ wedmAmount: t.wedmAmount, sedmAmount: t.sedmAmount })),
      totalWedmAmount: totals.reduce((sum, t) => sum + t.wedmAmount, 0),
      totalSedmAmount: totals.reduce((sum, t) => sum + t.sedmAmount, 0),
    };
  }, [jobs]);

  const clearQuantityErrors = useCallback((cutId: number | string, quantityIndex: number) => {
    setValidationErrors((prev) => {
      const next = new Map(prev);
      const cutErrors = next.get(cutId);
      if (!cutErrors) return next;
      const { [quantityIndex]: _, ...rest } = cutErrors;
      if (Object.keys(rest).length === 0) next.delete(cutId);
      else next.set(cutId, rest);
      return next;
    });
  }, [setValidationErrors]);

  const handleSaveQuantity = useCallback(async (cutId: number | string, quantityIndex: number) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData?.quantities?.[quantityIndex]) {
      showAndHideToast(setSaveToast, "No data to save for this quantity.", "error", 3000);
      return;
    }
    const qtyData = cutData.quantities[quantityIndex];
    const errors = validateQuantityInputs(qtyData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => {
        const next = new Map(prev);
        next.set(cutId, { ...(next.get(cutId) || {}), [quantityIndex]: errors });
        return next;
      });
      showAndHideToast(setSaveToast, "Please fix validation errors before saving.", "error", 3000);
      return;
    }

    try {
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) imageBase64 = await readImageFileAsBase64(qtyData.lastImageFile);
      const opsName = getOperatorOpsName(qtyData.opsName);
      const activeLogId =
        activeOperatorLogIds.get(`${String(cutId)}:${quantityIndex}`) ||
        await resolveActiveOperatorLogId(cutId, quantityIndex);
      const payload = buildSingleCapturePayload(
        qtyData,
        imageBase64,
        quantityIndex,
        activeLogId
      );

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
  }, [activeOperatorLogIds, clearQuantityErrors, cutInputs, resolveActiveOperatorLogId, setValidationErrors]);

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
      setValidationErrors((prev) => {
        const next = new Map(prev);
        next.set(cutId, { ...(next.get(cutId) || {}), [sourceQuantityIndex]: errors });
        return next;
      });
      showAndHideToast(setSaveToast, "Please fix validation errors before saving range.", "error", 3000);
      return;
    }
    try {
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) imageBase64 = await readImageFileAsBase64(qtyData.lastImageFile);
      const opsName = getOperatorOpsName(qtyData.opsName);
      const activeLogId =
        activeOperatorLogIds.get(`${String(cutId)}:${sourceQuantityIndex}`) ||
        await resolveActiveOperatorLogId(cutId, sourceQuantityIndex);
      await captureOperatorInput(
        String(cutId),
        buildRangeCapturePayload(
          qtyData,
          imageBase64,
          sourceQuantityIndex,
          fromQty,
          toQty,
          activeLogId
        )
      );
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
      showAndHideToast(
        setSaveToast,
        error?.message?.includes("overlaps")
          ? "Selected quantity/range already has captured data. Once captured, it cannot be replaced."
          : "Failed to save range. Please try again.",
        "error",
        3000
      );
    }
  }, [activeOperatorLogIds, cutInputs, jobs, resolveActiveOperatorLogId, setValidationErrors]);

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
  }, []);

  const handleStartTimeCaptured = useCallback(async (cutId: number | string, quantityIndex: number) => {
    const key = `${String(cutId)}:${quantityIndex}`;
    if (activeOperatorLogIds.has(key)) return;
    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) return;
    const qtyData = cutInputs.get(cutId)?.quantities?.[quantityIndex];
    const nextMachineNumber = String(qtyData?.machineNumber || "").trim();
    if (!nextMachineNumber) {
      showAndHideToast(setActionToast, "Select machine number before starting.", "error", 3000);
      return;
    }
    try {
      const fromQty = quantityIndex + 1;
      const startedLog = await startOperatorProductionLog({
        jobId: String(job.id),
        jobGroupId: String(job.groupId ?? ""),
        refNumber: String((job as any).refNumber || ""),
        customer: job.customer || "",
        description: job.description || "",
        settingLabel: String(job.setting || ""),
        fromQty,
        toQty: fromQty,
        quantityCount: 1,
        startedAt: new Date().toISOString(),
        machineNumber: nextMachineNumber,
        opsName: getOperatorOpsName(qtyData?.opsName || []),
      });
      if (startedLog?._id) {
        setActiveOperatorLogIds((prev) => {
          const next = new Map(prev);
          next.set(key, startedLog._id);
          return next;
        });
      }

      const nextAssignedTo = getAssignedToValue(getOperatorOpsName(qtyData?.opsName || []));
      if (nextAssignedTo || nextMachineNumber) {
        await updateOperatorJob(String(cutId), {
          ...(nextAssignedTo ? { assignedTo: nextAssignedTo } : {}),
          ...(nextMachineNumber ? { machineNumber: nextMachineNumber } : {}),
        });
      }
    } catch (error) {
      console.error("Failed to start operator production log", error);
      const message = error instanceof Error ? error.message : "Failed to start operator run.";
      showAndHideToast(setActionToast, message, "error", 3500);
    }
  }, [activeOperatorLogIds, cutInputs, jobs]);

  const handlePauseResumeAction = useCallback(async (
    cutId: number | string,
    quantityIndex: number,
    action: "shiftOver" | "resume"
  ) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData?.quantities?.[quantityIndex]) {
      showAndHideToast(setActionToast, "No quantity data found.", "error", 3000);
      return false;
    }

    const qtyData = cutData.quantities[quantityIndex];
    const key = `${String(cutId)}:${quantityIndex}`;
    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) {
      showAndHideToast(setActionToast, "Job not found.", "error", 3000);
      return false;
    }

    try {
      if (action === "resume") {
        const selectedOps = Array.isArray(qtyData.opsName)
          ? qtyData.opsName.map((name) => String(name || "").trim()).filter(Boolean)
          : [];

        if (!selectedOps.length) {
          showAndHideToast(
            setActionToast,
            "Select Ops Name before resuming.",
            "error",
            3000
          );
          return false;
        }

        if (!String(qtyData.machineNumber || "").trim()) {
          showAndHideToast(setActionToast, "Select machine number before resuming.", "error", 3000);
          return false;
        }

        const startedLog = await startOperatorProductionLog({
          jobId: String(job.id),
          jobGroupId: String(job.groupId ?? ""),
          refNumber: String((job as any).refNumber || ""),
          customer: job.customer || "",
          description: job.description || "",
          settingLabel: String(job.setting || ""),
          fromQty: quantityIndex + 1,
          toQty: quantityIndex + 1,
          quantityCount: 1,
          startedAt: new Date().toISOString(),
          machineNumber: String(qtyData.machineNumber || "").trim(),
          opsName: getOperatorOpsName(qtyData.opsName),
        });

        if (startedLog?._id) {
          setActiveOperatorLogIds((prev) => {
            const next = new Map(prev);
            next.set(key, startedLog._id);
            return next;
          });
        }

        await updateOperatorJob(String(cutId), {
          assignedTo: getAssignedToValue(getOperatorOpsName(qtyData.opsName)),
          machineNumber: String(qtyData.machineNumber || "").trim(),
        });

        return true;
      }

      const activeLogId = activeOperatorLogIds.get(key) || await resolveActiveOperatorLogId(cutId, quantityIndex);
      if (activeLogId) {
        await completeOperatorProductionLog({
          logId: activeLogId,
          status: "REJECTED",
          endedAt: new Date().toISOString(),
          machineNumber: String(qtyData.machineNumber || "").trim(),
          opsName: getOperatorOpsName(qtyData.opsName),
          machineHrs: String(qtyData.machineHrs || ""),
          idleTime: "Shift Over",
          idleTimeDuration: "",
        });
        setActiveOperatorLogIds((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }

      const nextAssignedTo = getAssignedToValue(getOperatorOpsName(qtyData.opsName));
      const nextMachineNumber = String(qtyData.machineNumber || "").trim();
      if (nextAssignedTo || nextMachineNumber) {
        await updateOperatorJob(String(cutId), {
          ...(nextAssignedTo ? { assignedTo: nextAssignedTo } : {}),
          ...(nextMachineNumber ? { machineNumber: nextMachineNumber } : {}),
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to process operator action", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : `Failed to ${action === "resume" ? "resume" : "shift over"} quantity.`;
      showAndHideToast(setActionToast, message, "error", 3500);
      return false;
    }
  }, [activeOperatorLogIds, currentUserDisplayName, cutInputs, jobs, resolveActiveOperatorLogId]);

  return {
    operatorUsers,
    savedQuantities,
    savedRanges,
    qaStatusesByCut,
    saveToast,
    setSaveToast,
    actionToast,
    setActionToast,
    pendingDispatch,
    setPendingDispatch,
    pendingReset,
    setPendingReset,
    amounts,
    handleSaveQuantity,
    handleSaveRange,
    handleUpdateQaStatus,
    handleStartTimeCaptured,
    handlePauseResumeAction,
  };
};
