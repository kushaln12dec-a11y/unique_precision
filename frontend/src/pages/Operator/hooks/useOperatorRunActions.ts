import { useCallback } from "react";
import { completeOperatorProductionLog, startOperatorProductionLog } from "../../../services/employeeLogsApi";
import { updateOperatorJob } from "../../../services/operatorApi";
import { getServerNowMs } from "../../../services/serverTime";
import type { JobEntry } from "../../../types/job";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { formatDurationToClock, formatWorkedSecondsAsMachineHrs, getCurrentSegmentWorkedSeconds } from "../utils/operatorTimeUtils";
import { getAssignedToValue, getOperatorOpsName } from "../utils/operatorCapturePayloads";
import { pauseRunningQuantity } from "../utils/operatorPauseState";
import { showAndHideToast } from "../utils/operatorViewActionUtils";

type Params = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  activeOperatorLogIds: Map<string, string>;
  resolveActiveOperatorLogId: (cutId: number | string, quantityIndex: number) => Promise<string | undefined>;
  setActiveOperatorLogIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setActionToast: React.Dispatch<React.SetStateAction<any>>;
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>;
  ensureCurrentUserAssigned: (job: JobEntry | undefined) => boolean;
  currentUserDisplayName: string;
};

export const useOperatorRunActions = ({
  jobs,
  cutInputs,
  activeOperatorLogIds,
  resolveActiveOperatorLogId,
  setActiveOperatorLogIds,
  setActionToast,
  setCutInputs,
  ensureCurrentUserAssigned,
  currentUserDisplayName,
}: Params) => {
  const getShiftOverKey = (cutId: number | string, quantityIndex: number) => `${String(cutId)}:${quantityIndex}`;

  const getResumeValidationMessage = (qtyData: QuantityInputData) => {
    const selectedOps = Array.isArray(qtyData.opsName)
      ? qtyData.opsName.map((name) => String(name || "").trim()).filter(Boolean)
      : [];
    if (!selectedOps.length) return "Select Ops Name before resuming.";
    if (!String(qtyData.machineNumber || "").trim()) return "Select machine number before resuming.";
    return null;
  };

  const buildShiftOverState = (qtyData: QuantityInputData, pausedAtMs: number) => ({
    ...pauseRunningQuantity(qtyData, pausedAtMs, currentUserDisplayName),
    pauseTimeOffsetSeconds: Number(qtyData.pauseTimeOffsetSeconds || 0),
    idleTime: "Shift Over",
    idleTimeDuration: formatDurationToClock(Number(qtyData.totalPauseTime || 0)),
    currentPauseReason: "Shift Over",
  });

  const buildResumeState = (
    qtyData: QuantityInputData,
    resumedAtMs: number,
    resumedAtDisplay: string,
    resumedStartTimeMs: number
  ): QuantityInputData => {
    const pauseDurationSeconds = qtyData.pauseStartTime
      ? Math.max(0, Math.floor((resumedAtMs - qtyData.pauseStartTime) / 1000))
      : 0;
    const carriedWorkedSeconds = Math.max(
      0,
      Number(qtyData.pausedElapsedTime || qtyData.workedDurationSeconds || 0)
    );
    const nextTotalPauseTime = Number(qtyData.totalPauseTime || 0) + pauseDurationSeconds;

    return {
      ...qtyData,
      startTime: resumedAtDisplay,
      startTimeEpochMs: resumedStartTimeMs,
      endTime: "",
      endTimeEpochMs: null,
      workedDurationSeconds: carriedWorkedSeconds,
      pauseTimeOffsetSeconds: nextTotalPauseTime,
      machineHrs: "",
      idleTime: "",
      idleTimeDuration: formatDurationToClock(nextTotalPauseTime),
      isPaused: false,
      pauseStartTime: null,
      totalPauseTime: nextTotalPauseTime,
      pausedElapsedTime: carriedWorkedSeconds,
      pauseSessions: [
        ...(qtyData.pauseSessions || []),
        {
          pauseStartTime: qtyData.pauseStartTime || resumedAtMs,
          pauseEndTime: resumedAtMs,
          pauseDuration: pauseDurationSeconds,
          reason: "Shift Over",
          operatorName: String(qtyData.currentPauseOperatorName || currentUserDisplayName || "").trim(),
        },
      ],
      currentPauseOperatorName: "",
      currentPauseReason: "",
    };
  };

  const handleStartTimeCaptured = useCallback(async (cutId: number | string, quantityIndex: number, timestampMs: number) => {
    const key = getShiftOverKey(cutId, quantityIndex);
    if (activeOperatorLogIds.has(key)) return;
    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) return;
    if (!ensureCurrentUserAssigned(job)) return;
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
        startedAt: new Date(timestampMs).toISOString(),
        machineNumber: nextMachineNumber,
        opsName: getOperatorOpsName(qtyData?.opsName || []),
      });
      const authoritativeStartedAtMs = new Date(String(startedLog?.startedAt || "")).getTime();
      const effectiveStartedAtMs = Number.isFinite(authoritativeStartedAtMs) && authoritativeStartedAtMs > 0 ? authoritativeStartedAtMs : timestampMs;
      const startedAtDisplay = getCurrentISTDateTime(effectiveStartedAtMs);

      if (startedLog?._id) {
        setActiveOperatorLogIds((prev) => new Map(prev).set(key, startedLog._id));
      }

      setCutInputs((prev) => {
        const currentCut = prev.get(cutId);
        const currentQty = currentCut?.quantities?.[quantityIndex];
        if (!currentCut || !currentQty) return prev;
        const next = new Map(prev);
        const quantities = [...currentCut.quantities];
        quantities[quantityIndex] = {
          ...currentQty,
          startTime: startedAtDisplay,
          startTimeEpochMs: effectiveStartedAtMs,
          endTime: "",
          endTimeEpochMs: null,
          pauseTimeOffsetSeconds: Number(currentQty.totalPauseTime || 0),
        };
        next.set(cutId, { ...currentCut, quantities });
        return next;
      });

      const nextAssignedTo = getAssignedToValue(getOperatorOpsName(qtyData?.opsName || []));
      if (nextAssignedTo || nextMachineNumber || startedAtDisplay) {
        await updateOperatorJob(String(cutId), {
          startTime: startedAtDisplay,
          endTime: "",
          idleTime: "",
          idleTimeDuration: "",
          ...(nextAssignedTo ? { assignedTo: nextAssignedTo } : {}),
          ...(nextMachineNumber ? { machineNumber: nextMachineNumber } : {}),
        });
      }
    } catch (error) {
      console.error("Failed to start operator production log", error);
      const message = error instanceof Error ? error.message : "Failed to start operator run.";
      showAndHideToast(setActionToast, message, "error", 3500);
    }
  }, [activeOperatorLogIds, cutInputs, ensureCurrentUserAssigned, jobs, setActionToast, setActiveOperatorLogIds, setCutInputs]);

  const handlePauseResumeAction = useCallback(async (cutId: number | string, quantityIndex: number, action: "shiftOver" | "resume") => {
    const cutData = cutInputs.get(cutId);
    if (!cutData?.quantities?.[quantityIndex]) {
      showAndHideToast(setActionToast, "No quantity data found.", "error", 3000);
      return false;
    }
    const qtyData = cutData.quantities[quantityIndex];
    const key = getShiftOverKey(cutId, quantityIndex);
    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) {
      showAndHideToast(setActionToast, "Job not found.", "error", 3000);
      return false;
    }
    if (!ensureCurrentUserAssigned(job)) return false;
    let previousQtySnapshot = { ...qtyData };

    try {
      if (action === "resume") {
        const validationMessage = getResumeValidationMessage(qtyData);
        if (validationMessage) {
          showAndHideToast(setActionToast, validationMessage, "error", 3000);
          return false;
        }

        const resumedAtMs = getServerNowMs();
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
          startedAt: new Date(resumedAtMs).toISOString(),
          machineNumber: String(qtyData.machineNumber || "").trim(),
          opsName: getOperatorOpsName(qtyData.opsName),
        });
        const authoritativeStartedAtMs = new Date(String(startedLog?.startedAt || "")).getTime();
        const effectiveStartedAtMs = Number.isFinite(authoritativeStartedAtMs) && authoritativeStartedAtMs > 0 ? authoritativeStartedAtMs : resumedAtMs;
        const resumedAtDisplay = getCurrentISTDateTime(effectiveStartedAtMs);

        if (startedLog?._id) {
          setActiveOperatorLogIds((prev) => new Map(prev).set(key, startedLog._id));
        }

        const nextQuantityState = buildResumeState(
          qtyData,
          effectiveStartedAtMs,
          resumedAtDisplay,
          effectiveStartedAtMs
        );

        setCutInputs((prev) => {
          const currentCut = prev.get(cutId);
          if (!currentCut?.quantities?.[quantityIndex]) return prev;
          const next = new Map(prev);
          const quantities = [...currentCut.quantities];
          quantities[quantityIndex] = nextQuantityState;
          next.set(cutId, { ...currentCut, quantities });
          return next;
        });

        await updateOperatorJob(String(cutId), {
          startTime: resumedAtDisplay,
          endTime: "",
          idleTime: "",
          idleTimeDuration: nextQuantityState.idleTimeDuration,
          assignedTo: getAssignedToValue(getOperatorOpsName(qtyData.opsName)),
          machineNumber: String(qtyData.machineNumber || "").trim(),
        });

        return true;
      }

      const activeLogId = activeOperatorLogIds.get(key) || await resolveActiveOperatorLogId(cutId, quantityIndex);
      const pausedAtMs = getServerNowMs();
      const pausedAtDisplay = getCurrentISTDateTime(pausedAtMs);
      const segmentWorkedSeconds = getCurrentSegmentWorkedSeconds(qtyData, pausedAtMs);
      const segmentMachineHrs = formatWorkedSecondsAsMachineHrs(segmentWorkedSeconds);
      const nextPausedState = buildShiftOverState(qtyData, pausedAtMs);
      setCutInputs((prev) => {
        const currentCut = prev.get(cutId);
        const currentQty = currentCut?.quantities?.[quantityIndex];
        if (!currentCut || !currentQty) return prev;
        previousQtySnapshot = { ...currentQty };
        const next = new Map(prev);
        const quantities = [...currentCut.quantities];
        quantities[quantityIndex] = buildShiftOverState(currentQty, pausedAtMs);
        next.set(cutId, { ...currentCut, quantities });
        return next;
      });
      if (activeLogId) {
        await completeOperatorProductionLog({
          logId: activeLogId,
          status: "REJECTED",
          endedAt: new Date(pausedAtMs).toISOString(),
          machineNumber: String(qtyData.machineNumber || "").trim(),
          opsName: getOperatorOpsName(qtyData.opsName),
          machineHrs: segmentMachineHrs,
          workedSeconds: segmentWorkedSeconds,
          idleTime: "Shift Over",
          idleTimeDuration: nextPausedState.idleTimeDuration,
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
          endTime: "",
          idleTime: "Shift Over",
          idleTimeDuration: nextPausedState.idleTimeDuration,
          startTime: String(qtyData.startTime || pausedAtDisplay),
          ...(nextAssignedTo ? { assignedTo: nextAssignedTo } : {}),
          ...(nextMachineNumber ? { machineNumber: nextMachineNumber } : {}),
        });
      }

      return true;
    } catch (error) {
      if (action === "shiftOver") {
        setCutInputs((prev) => {
          const currentCut = prev.get(cutId);
          if (!currentCut?.quantities?.[quantityIndex]) return prev;
          const next = new Map(prev);
          const quantities = [...currentCut.quantities];
          quantities[quantityIndex] = previousQtySnapshot;
          next.set(cutId, { ...currentCut, quantities });
          return next;
        });
      }
      console.error("Failed to process operator action", error);
      const message = error instanceof Error && error.message ? error.message : `Failed to ${action === "resume" ? "resume" : "shift over"} quantity.`;
      showAndHideToast(setActionToast, message, "error", 3500);
      return false;
    }
  }, [activeOperatorLogIds, currentUserDisplayName, cutInputs, ensureCurrentUserAssigned, jobs, resolveActiveOperatorLogId, setActionToast, setActiveOperatorLogIds, setCutInputs]);

  return {
    handleStartTimeCaptured,
    handlePauseResumeAction,
  };
};
