import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import { useOperatorViewData } from "./hooks/useOperatorViewData";
import { useOperatorInputs } from "./hooks/useOperatorInputs";
import { useOperatorViewActions } from "./hooks/useOperatorViewActions";
import { OperatorJobInfo } from "./components/OperatorJobInfo";
import { OperatorCutCard } from "./components/OperatorCutCard";
import { OperatorTotalsSection } from "./components/OperatorTotalsSection";
import OperatorViewModals from "./components/OperatorViewModals";
import type { CutInputData } from "./types/cutInput";
import { createEmptyCutInputData } from "./types/cutInput";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { estimatedDurationSecondsFromHours, estimatedHoursFromAmount, MACHINE_OPTIONS, toMachineIndex } from "../../utils/jobFormatting";
import { getQuantityElapsedSeconds, parseOperatorDateTime } from "./utils/operatorTimeUtils";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "../Programmer/components/JobDetailsModal.css";
import "./OperatorViewPage.css";
import "./components/DateTimeInput.css";

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const cutIdParam = searchParams.get("cutId");
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const currentUserDisplayName = getUserDisplayNameFromToken() || "";

  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, Record<string, string>>>>(new Map());
  const [liveNowMs, setLiveNowMs] = useState<number>(Date.now());
  const [pendingShiftOver, setPendingShiftOver] = useState<{ cutId: number | string; quantityIndex: number } | null>(null);

  const {
    jobs,
    loadingJobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    toggleCutExpansion,
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
    handleShiftOverAction,
  } = useOperatorViewActions({ jobs, cutInputs, setValidationErrors, currentUserDisplayName });

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
    if (!hasActiveQuantityTimer) return;
    const timerId = window.setInterval(() => {
      setLiveNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [hasActiveQuantityTimer]);

  const groupOvertimeSeconds = useMemo(() => {
    const expectedSeconds = estimatedDurationSecondsFromHours(groupEstimatedHrs);
    if (expectedSeconds <= 0) return 0;

    let maxElapsedSeconds = 0;
    cutInputs.forEach((cut) => {
      (cut.quantities || []).forEach((quantity) => {
        maxElapsedSeconds = Math.max(maxElapsedSeconds, getQuantityElapsedSeconds(quantity, liveNowMs));
      });
    });

    return Math.max(0, maxElapsedSeconds - expectedSeconds);
  }, [cutInputs, groupEstimatedHrs, liveNowMs]);

  const getCutInputData = (cutId: number | string, quantity: number = 1): CutInputData => {
    return cutInputs.get(cutId) || createEmptyCutInputData(quantity);
  };

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content operator-viewpage-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          {loadingJobs ? (
            <AppLoader message="Loading operator details..." />
          ) : jobs.length > 0 && parentJob ? (
            <>
              {/* Page Heading */}
              <div className="operator-page-heading">
                <div className="operator-page-heading-left">
                  <h2>Job Details - {parentJob.customer || "N/A"}</h2>
                  <div className="operator-page-heading-meta">
                    <span>
                      <strong>Description:</strong> {parentJob.description || "-"}
                    </span>
                    <span>
                      <strong>Total Qty:</strong> {totalGroupQuantity}
                    </span>
                  </div>
                </div>
                {cutIdParam && (
                  <span className="cut-indicator">
                    Viewing Setting {jobs.findIndex((j) => String(j.id) === String(cutIdParam)) + 1}
                  </span>
                )}
              </div>

              {/* Job Information Section */}
              <OperatorJobInfo parentJob={parentJob} groupId={groupId} />

              {/* Cuts Information Section */}
              <div className="operator-cuts-section">
                <h3 className="operator-section-title">Settings ({jobs.length})</h3>
                <div className="operator-cuts-container">
                  {jobs.map((cutItem, index) => {
                    const quantity = Number(cutItem.qty || 1);
                    const cutData = getCutInputData(cutItem.id, quantity);
                    const isExpanded = expandedCuts.has(cutItem.id);
                    const errors = validationErrors.get(cutItem.id as number) || {};
                    const saved = savedQuantities.get(cutItem.id) || new Set<number>();
                    const savedRangeSet = savedRanges.get(cutItem.id) || new Set<string>();
                    const qaStatuses = qaStatusesByCut.get(cutItem.id) || {};

                    return (
                      <OperatorCutCard
                        key={cutItem.id}
                        cutItem={cutItem}
                        index={index}
                        cutData={cutData}
                        isExpanded={isExpanded}
                        operatorUsers={operatorUsers}
                        machineOptions={machineOptions}
                        onToggleExpansion={() => toggleCutExpansion(cutItem.id)}
                        onImageChange={(files) => handleCutImageChange(cutItem.id, files)}
                        onInputChange={handleInputChange}
                        onApplyToAllQuantities={copyQuantityToAll}
                        onApplyToCountQuantities={copyQuantityToCount}
                        onSaveQuantity={handleSaveQuantity}
                        onSaveRange={handleSaveRange}
                        qaStatuses={qaStatuses}
                        onSendToQa={(cutId, quantityNumbers) => {
                          if (!quantityNumbers.length) return;
                          setPendingDispatch({ cutId, quantityNumbers });
                        }}
                        savedQuantities={saved}
                        savedRanges={savedRangeSet}
                        validationErrors={errors}
                        onShowToast={(message, variant = "info") => {
                          setActionToast({ message, variant, visible: true });
                          setTimeout(() => {
                            setActionToast((prev) => ({ ...prev, visible: false }));
                          }, 2000);
                        }}
                        onRequestResetTimer={(cutId, quantityIndex) => {
                          setPendingReset({ cutId, quantityIndex });
                        }}
                        onRequestShiftOver={(cutId, quantityIndex) => {
                          setPendingShiftOver({ cutId, quantityIndex });
                        }}
                        onStartTimeCaptured={handleStartTimeCaptured}
                        isAdmin={isAdmin}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Totals Section */}
              <OperatorTotalsSection
                groupEstimatedHrs={groupEstimatedHrs}
                totalWedmAmount={amounts.totalWedmAmount}
                totalSedmAmount={amounts.totalSedmAmount}
                groupTotalAmount={groupTotalAmount}
                isAdmin={isAdmin}
                overtimeSeconds={groupOvertimeSeconds}
              />
            </>
          ) : (
            <div className="roleboard-body">
              <AppLoader variant="inline" message="No data available." />
            </div>
          )}
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
        pendingShiftOver={pendingShiftOver}
        setPendingShiftOver={setPendingShiftOver}
        handleUpdateQaStatus={handleUpdateQaStatus}
        handleInputChange={handleInputChange}
        handleShiftOverAction={handleShiftOverAction}
        setActionToast={setActionToast}
      />
    </div>
  );
};

export default OperatorViewPage;
