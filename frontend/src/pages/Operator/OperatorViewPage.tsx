import { useCallback, useMemo, useState, useEffect } from "react";
import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import { resetOperatorQuantity } from "../../services/operatorApi";
import { useOperatorViewData } from "./hooks/useOperatorViewData";
import { useOperatorInputs } from "./hooks/useOperatorInputs";
import { useOperatorViewActions } from "./hooks/useOperatorViewActions";
import OperatorViewBody from "./components/OperatorViewBody";
import OperatorViewModals from "./components/OperatorViewModals";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { estimatedDurationSecondsFromHours, estimatedHoursFromAmount, MACHINE_OPTIONS, toMachineIndex } from "../../utils/jobFormatting";
import { getQuantityElapsedSeconds, parseOperatorDateTime } from "./utils/operatorTimeUtils";
import { getServerNowMs, refreshServerTimeOffset } from "../../services/serverTime";
import { useJobSync } from "../../hooks/useJobSync";
import { getCurrentISTDateTime } from "../../utils/dateTime";
import { calculateMachineHrs } from "./utils/machineHrsCalculation";
import { useOperatorAssignmentSync } from "./hooks/useOperatorAssignmentSync";
import { getPersistedIdleDuration, getPersistedIdleReason } from "./utils/operatorViewPageHelpers";
import { getEffectiveSegmentPauseSeconds } from "./utils/operatorInputState";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "../Programmer/components/JobDetailsModal.css";
import "./OperatorViewPage.css";
import "./components/DateTimeInput.css";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const cutIdParam = searchParams.get("cutId");
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const isAdmin = userRole === "ADMIN";
  const canOperateInputs = userRole === "ADMIN" || userRole === "OPERATOR";
  const canEditAssignments = userRole === "ADMIN" || userRole === "PROGRAMMER" || userRole === "OPERATOR";
  const currentUserDisplayName = normalizeOperatorName(getUserDisplayNameFromToken() || "");

  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, Record<string, string>>>>(new Map());
  const [liveNowMs, setLiveNowMs] = useState<number>(getServerNowMs());
  const [pendingEndTimeCapture, setPendingEndTimeCapture] = useState<{
    cutId: number | string;
    quantityIndex: number;
    timestampMs: number;
    previousEndTime: string;
    previousEndTimeEpochMs: number | null;
    previousMachineHrs: string;
  } | null>(null);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const reloadInFlightRef = useRef<Promise<void> | null>(null);

  const getScrollContainer = useCallback(
    () => document.querySelector(".roleboard-content") as HTMLElement | null,
    []
  );

  const {
    jobs,
    loadingJobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    toggleCutExpansion,
    reloadOperatorViewData,
  } = useOperatorViewData(groupId, cutIdParam);

  const { handleCutImageChange, handleInputChange, copyQuantityToAll, copyQuantityToCount } = useOperatorInputs(
    cutInputs,
    setCutInputs,
    idleTimeConfigs,
    validationErrors,
    setValidationErrors,
    currentUserDisplayName
  );

  const {
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
    handleEndTimeCaptured,
  } = useOperatorViewActions({ jobs, cutInputs, setCutInputs, setValidationErrors, currentUserDisplayName, isAdmin });
  const allowedOperatorUsers = useMemo(() => operatorUsers, [operatorUsers]);

  useOperatorAssignmentSync({
    allowedOperatorUsers,
    canEditAssignments,
    cutInputs,
    currentUserDisplayName,
    jobs,
    setCutInputs,
    userRole,
  });

  const restoreScrollPosition = useCallback(() => {
    if (pendingScrollRestoreRef.current === null) return;
    const nextScrollTop = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;
    window.requestAnimationFrame(() => {
      const scrollContainer = getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop = nextScrollTop;
        return;
      }
      window.scrollTo({ top: nextScrollTop, behavior: "auto" });
    });
  }, [getScrollContainer]);

  const reloadOperatorViewDataPreservingScroll = useCallback(async () => {
    if (pendingScrollRestoreRef.current === null) {
      pendingScrollRestoreRef.current = getScrollContainer()?.scrollTop ?? window.scrollY;
    }

    if (reloadInFlightRef.current) {
      await reloadInFlightRef.current;
      return;
    }

    const reloadPromise = (async () => {
      await reloadOperatorViewData();
    })();

    reloadInFlightRef.current = reloadPromise;

    try {
      await reloadPromise;
    } finally {
      reloadInFlightRef.current = null;
    }
  }, [getScrollContainer, reloadOperatorViewData]);

  const handleRequestEndTimeCapture = useCallback((cutId: number | string, quantityIndex: number, timestampMs: number) => {
    const qtyData = cutInputs.get(cutId)?.quantities?.[quantityIndex];
    if (!qtyData?.startTime) {
      setActionToast({
        message: "Start time is required before capturing end time.",
        variant: "error",
        visible: true,
      });
      setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 2200);
      return;
    }

    const displayValue = getCurrentISTDateTime(timestampMs);
    const persistedIdleDuration = getPersistedIdleDuration(Number(qtyData.totalPauseTime || 0), qtyData.idleTimeDuration);
    const segmentPauseSeconds = getEffectiveSegmentPauseSeconds(qtyData);
    const machineHrs = calculateMachineHrs(
      String(qtyData.startTime || ""),
      displayValue,
      persistedIdleDuration,
      segmentPauseSeconds,
      qtyData.startTimeEpochMs || null,
      timestampMs
    );

    setCutInputs((prev) => {
      const currentCut = prev.get(cutId);
      const currentQty = currentCut?.quantities?.[quantityIndex];
      if (!currentCut || !currentQty) return prev;
      const next = new Map(prev);
      const quantities = [...currentCut.quantities];
      quantities[quantityIndex] = {
        ...currentQty,
        endTime: displayValue,
        endTimeEpochMs: timestampMs,
        machineHrs,
      };
      next.set(cutId, { ...currentCut, quantities });
      return next;
    });

    setPendingEndTimeCapture({
      cutId,
      quantityIndex,
      timestampMs,
      previousEndTime: String(qtyData.endTime || ""),
      previousEndTimeEpochMs: qtyData.endTimeEpochMs || null,
      previousMachineHrs: String(qtyData.machineHrs || ""),
    });
  }, [cutInputs, getPersistedIdleDuration, setActionToast, setCutInputs]);

  const handleCancelEndTimeCapture = useCallback(() => {
    if (!pendingEndTimeCapture) return;

    setCutInputs((prev) => {
      const currentCut = prev.get(pendingEndTimeCapture.cutId);
      const currentQty = currentCut?.quantities?.[pendingEndTimeCapture.quantityIndex];
      if (!currentCut || !currentQty) return prev;
      const next = new Map(prev);
      const quantities = [...currentCut.quantities];
      quantities[pendingEndTimeCapture.quantityIndex] = {
        ...currentQty,
        endTime: pendingEndTimeCapture.previousEndTime,
        endTimeEpochMs: pendingEndTimeCapture.previousEndTimeEpochMs,
        machineHrs: pendingEndTimeCapture.previousMachineHrs,
      };
      next.set(pendingEndTimeCapture.cutId, { ...currentCut, quantities });
      return next;
    });

    setPendingEndTimeCapture(null);
  }, [pendingEndTimeCapture, setCutInputs]);

  const handleConfirmEndTimeCapture = async (cutId: number | string, quantityIndex: number, timestampMs: number) => {
    const qtyData = cutInputs.get(cutId)?.quantities?.[quantityIndex];
    if (!qtyData?.startTime) {
      setActionToast({
        message: "Start time is required before capturing end time.",
        variant: "error",
        visible: true,
      });
      setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 2200);
      return false;
    }

    const displayValue = getCurrentISTDateTime(timestampMs);
    const persistedIdleDuration = getPersistedIdleDuration(Number(qtyData.totalPauseTime || 0), qtyData.idleTimeDuration);
    const persistedIdleReason = getPersistedIdleReason(qtyData.pauseSessions || [], qtyData.idleTime);
    const segmentPauseSeconds = getEffectiveSegmentPauseSeconds(qtyData);
    const machineHrs = calculateMachineHrs(
      String(qtyData.startTime || ""),
      displayValue,
      persistedIdleDuration,
      segmentPauseSeconds,
      qtyData.startTimeEpochMs || null,
      timestampMs
    );

    const success = await handleEndTimeCaptured(cutId, quantityIndex, {
      timestampMs,
      endTime: displayValue,
      machineHrs,
      idleTime: persistedIdleReason,
      idleTimeDuration: persistedIdleDuration,
    });
    if (!success) return false;

    await reloadOperatorViewDataPreservingScroll();
    setPendingEndTimeCapture(null);
    setActionToast({
      message: "End time captured successfully!",
      variant: "success",
      visible: true,
    });
    setTimeout(() => {
      setActionToast((prev) => ({ ...prev, visible: false }));
    }, 2200);
    return true;
  };

  const refreshRemoteOperatorView = useCallback(() => {
    void reloadOperatorViewDataPreservingScroll();
  }, [reloadOperatorViewDataPreservingScroll]);

  useJobSync(() => {
    refreshRemoteOperatorView();
  }, Boolean(groupId));

  useEffect(() => {
    if (!loadingJobs) restoreScrollPosition();
  }, [loadingJobs, restoreScrollPosition]);

  const parentJob = jobs.length > 0 ? jobs[0] : null;
  const totalGroupQuantity = jobs.reduce((sum, job) => sum + Math.max(1, Number(job.qty || 1)), 0);
  const groupTotalAmount = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  const groupEstimatedHrs = estimatedHoursFromAmount(amounts.totalWedmAmount || 0);
  const machineOptions = useMemo(() => {
    const options = new Set<string>(MACHINE_OPTIONS.map((machine) => toMachineIndex(machine)).filter(Boolean));
    jobs.forEach((job) => {
      const jobMachine = toMachineIndex(String((job as any).machineNumber || "").trim());
      if (jobMachine) options.add(jobMachine);
      const captures = Array.isArray((job as any).operatorCaptures) ? (job as any).operatorCaptures : [];
      captures.forEach((capture: any) => {
        const captureMachine = toMachineIndex(String(capture?.machineNumber || "").trim());
        if (captureMachine) options.add(captureMachine);
      });
    });
    return Array.from(options);
  }, [jobs]);

  const hasActiveQuantityTimer = useMemo(
    () =>
      Array.from(cutInputs.values()).some((cut) =>
        (cut.quantities || []).some((quantity) => {
          const hasStart = Boolean(
            (quantity.startTimeEpochMs && Number.isFinite(Number(quantity.startTimeEpochMs))) ||
              parseOperatorDateTime(quantity.startTime)
          );
          const hasEnd = Boolean(
            (quantity.endTimeEpochMs && Number.isFinite(Number(quantity.endTimeEpochMs))) ||
              parseOperatorDateTime(quantity.endTime)
          );
          return hasStart && !hasEnd;
        })
      ),
    [cutInputs]
  );

  useEffect(() => {
    void refreshServerTimeOffset(true).catch(() => {});
    const syncTimerId = window.setInterval(() => {
      void refreshServerTimeOffset().catch(() => {});
    }, 15000);
    return () => window.clearInterval(syncTimerId);
  }, []);

  useEffect(() => {
    if (!hasActiveQuantityTimer) return;
    const timerId = window.setInterval(() => {
      setLiveNowMs(getServerNowMs());
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [hasActiveQuantityTimer]);

  const groupOvertimeSeconds = useMemo(() => {
    const expectedSeconds = estimatedDurationSecondsFromHours(groupEstimatedHrs);
    if (expectedSeconds <= 0) return 0;

    let totalElapsedSeconds = 0;
    cutInputs.forEach((cut) => {
      (cut.quantities || []).forEach((quantity) => {
        totalElapsedSeconds += getQuantityElapsedSeconds(quantity, liveNowMs);
      });
    });

    return Math.max(0, totalElapsedSeconds - expectedSeconds);
  }, [cutInputs, groupEstimatedHrs, liveNowMs]);

  const handleResetQuantity = async (cutId: number | string, quantityIndex: number) => {
    try {
      await resetOperatorQuantity(String(cutId), { quantityNumber: quantityIndex + 1 });
      handleInputChange(cutId, quantityIndex, "resetTimer", "");
      await reloadOperatorViewDataPreservingScroll();
      setActionToast({
        message: `Quantity ${quantityIndex + 1} reset successfully.`,
        variant: "success",
        visible: true,
      });
      window.setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 2400);
    } catch (error) {
      console.error("Failed to reset operator quantity", error);
      setActionToast({
        message: "Failed to reset quantity. Please try again.",
        variant: "error",
        visible: true,
      });
      window.setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  const handleImmediateOperatorAction = useCallback(async (
    cutId: number | string,
    quantityIndex: number,
    action: "shiftOver" | "resume"
  ) => {
    const success = await handlePauseResumeAction(cutId, quantityIndex, action);
    if (!success) return;
    setActionToast({
      message: action === "resume" ? "Quantity resumed." : "Shift over saved.",
      variant: "info",
      visible: true,
    });
    window.setTimeout(() => {
      setActionToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  }, [handlePauseResumeAction, setActionToast]);

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content operator-viewpage-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          <OperatorViewBody
            jobs={jobs}
            parentJob={parentJob}
            groupId={groupId}
            cutIdParam={cutIdParam}
            totalGroupQuantity={totalGroupQuantity}
            cutInputs={cutInputs}
            expandedCuts={expandedCuts}
            validationErrors={validationErrors}
            savedQuantities={savedQuantities}
            savedRanges={savedRanges}
            qaStatusesByCut={qaStatusesByCut}
            allowedOperatorUsers={allowedOperatorUsers}
            machineOptions={machineOptions}
            canEditAssignments={canEditAssignments}
            canOperateInputs={canOperateInputs}
            toggleCutExpansion={toggleCutExpansion}
            handleCutImageChange={handleCutImageChange}
            handleInputChange={handleInputChange}
            copyQuantityToAll={copyQuantityToAll}
            copyQuantityToCount={copyQuantityToCount}
            handleSaveQuantity={handleSaveQuantity}
            handleSaveRange={handleSaveRange}
            setPendingDispatch={setPendingDispatch}
            setActionToast={setActionToast}
            setPendingReset={setPendingReset}
            handleImmediateOperatorAction={handleImmediateOperatorAction}
            onRequestEndTimeCapture={handleRequestEndTimeCapture}
            handleStartTimeCaptured={handleStartTimeCaptured}
            isAdmin={isAdmin}
            currentUserDisplayName={currentUserDisplayName}
            groupEstimatedHrs={groupEstimatedHrs}
            totalWedmAmount={amounts.totalWedmAmount}
            totalSedmAmount={amounts.totalSedmAmount}
            groupTotalAmount={groupTotalAmount}
            groupOvertimeSeconds={groupOvertimeSeconds}
            loadingJobs={loadingJobs}
          />
        </div>
      </div>
      <Toast
        message={saveToast.message}
        visible={saveToast.visible}
        variant={saveToast.variant}
        onClose={() => setSaveToast((prev) => ({ ...prev, visible: false }))}
      />
      <Toast
        message={actionToast.message}
        visible={actionToast.visible}
        variant={actionToast.variant}
        onClose={() => setActionToast((prev) => ({ ...prev, visible: false }))}
      />
      <OperatorViewModals
        jobs={jobs}
        pendingDispatch={pendingDispatch}
        setPendingDispatch={setPendingDispatch}
        pendingReset={pendingReset}
        setPendingReset={setPendingReset}
        pendingEndTimeCapture={pendingEndTimeCapture}
        handleCancelEndTimeCapture={handleCancelEndTimeCapture}
        handleUpdateQaStatus={handleUpdateQaStatus}
        handleResetQuantity={handleResetQuantity}
        handleConfirmEndTimeCapture={handleConfirmEndTimeCapture}
      />
    </div>
  );
};

export default OperatorViewPage;
