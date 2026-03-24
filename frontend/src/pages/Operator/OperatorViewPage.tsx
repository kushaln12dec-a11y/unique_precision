import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { useOperatorViewData } from "./hooks/useOperatorViewData";
import { useOperatorInputs } from "./hooks/useOperatorInputs";
import { useOperatorViewActions } from "./hooks/useOperatorViewActions";
import { useOperatorSubmit } from "./hooks/useOperatorSubmit";
import { OperatorJobInfo } from "./components/OperatorJobInfo";
import { OperatorCutCard } from "./components/OperatorCutCard";
import { OperatorTotalsSection } from "./components/OperatorTotalsSection";
import type { CutInputData } from "./types/cutInput";
import { createEmptyCutInputData } from "./types/cutInput";
import { getUserRoleFromToken } from "../../utils/auth";
import { estimatedHoursFromAmount } from "../../utils/jobFormatting";
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

  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, Record<string, string>>>>(new Map());
  const [liveNowMs, setLiveNowMs] = useState<number>(Date.now());

  const {
    jobs,
    loadingJobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    setExpandedCuts,
    toggleCutExpansion,
  } = useOperatorViewData(groupId, cutIdParam);

  const { handleCutImageChange, handleInputChange, copyQuantityToAll, copyQuantityToCount } = useOperatorInputs(
    cutInputs,
    setCutInputs,
    idleTimeConfigs,
    validationErrors,
    setValidationErrors
  );

  const { handleSubmit, toast, setToast } = useOperatorSubmit(
    groupId,
    jobs,
    cutInputs,
    setExpandedCuts,
    setValidationErrors
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
  } = useOperatorViewActions({ jobs, cutInputs, setValidationErrors });

  const parentJob = jobs.length > 0 ? jobs[0] : null;
  const totalGroupQuantity = jobs.reduce((sum, job) => sum + Math.max(1, Number(job.qty || 1)), 0);
  const groupTotalAmount = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  const groupEstimatedHrs = estimatedHoursFromAmount(amounts.totalWedmAmount || 0);

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
    const expectedSeconds = Math.max(0, Math.round(groupEstimatedHrs * 3600));
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

  const pendingDispatchJob = pendingDispatch ? jobs.find((job) => String(job.id) === String(pendingDispatch.cutId)) : null;
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

              {/* Action Buttons */}
              <div className="operator-view-actions">
                <button className="btn-secondary" onClick={() => navigate("/operator")}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSubmit}>
                  Submit
                </button>
              </div>
            </>
          ) : (
            <div className="roleboard-body">
              <AppLoader variant="inline" message="No operator job data found for this view." />
            </div>
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, visible: false })}
      />
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
      {pendingDispatch && (
        <ConfirmDeleteModal
          title="Confirm Dispatch"
          message="Are you sure you want to dispatch selected quantity to QC?"
          details={[
            { label: "Setting", value: pendingDispatchJob ? String(jobs.findIndex((j) => String(j.id) === String(pendingDispatch.cutId)) + 1) : "N/A" },
            { label: "Quantities", value: pendingDispatch.quantityNumbers.join(", ") },
          ]}
          confirmButtonText="Dispatch To QC"
          onConfirm={async () => {
            await handleUpdateQaStatus(pendingDispatch.cutId, pendingDispatch.quantityNumbers, "SENT_TO_QA");
            setPendingDispatch(null);
          }}
          onCancel={() => setPendingDispatch(null)}
        />
      )}
      {pendingReset && (
        <ConfirmDeleteModal
          title="Confirm Reset"
          message="Are you sure you want to reset this quantity timer?"
          details={[
            { label: "Setting", value: String(jobs.findIndex((j) => String(j.id) === String(pendingReset.cutId)) + 1) },
            { label: "Quantity", value: String(pendingReset.quantityIndex + 1) },
          ]}
          confirmButtonText="Reset Timer"
          onConfirm={() => {
            handleInputChange(pendingReset.cutId, pendingReset.quantityIndex, "resetTimer", "");
            setPendingReset(null);
          }}
          onCancel={() => setPendingReset(null)}
        />
      )}
    </div>
  );
};

export default OperatorViewPage;
