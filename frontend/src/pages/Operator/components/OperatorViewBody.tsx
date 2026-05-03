import React from "react";
import AppLoader from "../../../components/AppLoader";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { OperatorCutCard } from "./OperatorCutCard";
import { OperatorJobInfo } from "./OperatorJobInfo";
import { OperatorTotalsSection } from "./OperatorTotalsSection";
import { isCurrentUserAssignedToJob } from "../utils/operatorViewPageHelpers";

type Props = {
  jobs: JobEntry[];
  parentJob: JobEntry | null;
  groupId: string | null;
  cutIdParam: string | null;
  totalGroupQuantity: number;
  cutInputs: Map<number | string, CutInputData>;
  expandedCuts: Set<number | string>;
  validationErrors: Map<number | string, Record<string, Record<string, string>>>;
  savedQuantities: Map<number | string, Set<number>>;
  savedRanges: Map<number | string, Set<string>>;
  qaStatusesByCut: Map<number | string, Record<number, any>>;
  allowedOperatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  canEditAssignments: boolean;
  canOperateInputs: boolean;
  toggleCutExpansion: (cutId: number | string) => void;
  handleCutImageChange: (cutId: number | string, files: File[]) => void | Promise<void>;
  handleInputChange: (cutId: number | string, quantityIndex: number, field: any, value: any) => void;
  copyQuantityToAll: (cutId: number | string, sourceQuantityIndex: number, totalQuantity: number) => void;
  copyQuantityToCount: (cutId: number | string, sourceQuantityIndex: number, totalQuantity: number, quantityCount: number) => void;
  handleSaveQuantity: (cutId: number | string, quantityIndex: number) => void | Promise<void>;
  handleSaveRange: (cutId: number | string, sourceQuantityIndex: number, fromQty: number, toQty: number) => void | Promise<void>;
  setPendingDispatch: React.Dispatch<React.SetStateAction<{ cutId: number | string; quantityNumbers: number[] } | null>>;
  setActionToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
  setPendingReset: React.Dispatch<React.SetStateAction<{ cutId: number | string; quantityIndex: number } | null>>;
  handleImmediateOperatorAction: (cutId: number | string, quantityIndex: number, action: "shiftOver" | "resume") => void | Promise<void>;
  setPendingEndTimeCapture: React.Dispatch<React.SetStateAction<{ cutId: number | string; quantityIndex: number } | null>>;
  handleStartTimeCaptured: (cutId: number | string, quantityIndex: number) => void | Promise<void>;
  isAdmin: boolean;
  currentUserDisplayName: string;
  groupEstimatedHrs: number;
  totalWedmAmount: number;
  totalSedmAmount: number;
  groupTotalAmount: number;
  groupOvertimeSeconds: number;
  loadingJobs: boolean;
};

const getCutInputData = (cutInputs: Map<number | string, CutInputData>, cutId: number | string, quantity: number = 1): CutInputData =>
  cutInputs.get(cutId) || { quantities: Array.from({ length: quantity }, () => ({
    startTime: "",
    startTimeEpochMs: null,
    endTime: "",
    endTimeEpochMs: null,
    workedDurationSeconds: 0,
    pauseTimeOffsetSeconds: 0,
    machineHrs: "",
    machineNumber: "",
    opsName: [],
    operatorHistory: [],
    operatorHistoryDetails: [],
    idleTime: "",
    idleTimeDuration: "",
    lastImage: null,
    lastImageFile: null,
    isPaused: false,
    pauseStartTime: null,
    totalPauseTime: 0,
    pausedElapsedTime: 0,
    pauseSessions: [],
    currentPauseReason: "",
  })) };

const OperatorViewBody: React.FC<Props> = ({
  jobs,
  parentJob,
  groupId,
  cutIdParam,
  totalGroupQuantity,
  cutInputs,
  expandedCuts,
  validationErrors,
  savedQuantities,
  savedRanges,
  qaStatusesByCut,
  allowedOperatorUsers,
  machineOptions,
  canEditAssignments,
  canOperateInputs,
  toggleCutExpansion,
  handleCutImageChange,
  handleInputChange,
  copyQuantityToAll,
  copyQuantityToCount,
  handleSaveQuantity,
  handleSaveRange,
  setPendingDispatch,
  setActionToast,
  setPendingReset,
  handleImmediateOperatorAction,
  setPendingEndTimeCapture,
  handleStartTimeCaptured,
  isAdmin,
  currentUserDisplayName,
  groupEstimatedHrs,
  totalWedmAmount,
  totalSedmAmount,
  groupTotalAmount,
  groupOvertimeSeconds,
  loadingJobs,
}) => {
  if (loadingJobs) {
    return <AppLoader message="Loading operator details..." />;
  }

  if (!(jobs.length > 0 && parentJob)) {
    return (
      <div className="roleboard-body">
        <AppLoader variant="inline" message="No data available." />
      </div>
    );
  }

  return (
    <>
      <div className="operator-page-heading">
        <div className="operator-page-heading-left">
          <h2>Job Details - {parentJob.customer || "N/A"}</h2>
          <div className="operator-page-heading-meta">
            <span><strong>Description:</strong> {parentJob.description || "-"}</span>
            <span><strong>Total Qty:</strong> {totalGroupQuantity}</span>
          </div>
        </div>
        {cutIdParam && (
          <span className="cut-indicator">
            Viewing Setting {jobs.findIndex((j) => String(j.id) === String(cutIdParam)) + 1}
          </span>
        )}
      </div>

      <OperatorJobInfo parentJob={parentJob} groupId={groupId} />

      <div className="operator-cuts-section">
        <h3 className="operator-section-title">Settings ({jobs.length})</h3>
        <div className="operator-cuts-container">
          {jobs.map((cutItem, index) => {
            const quantity = Number(cutItem.qty || 1);
            const cutData = getCutInputData(cutInputs, cutItem.id, quantity);
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
                operatorUsers={allowedOperatorUsers}
                machineOptions={machineOptions}
                canEditAssignments={canEditAssignments}
                canOperateInputs={canOperateInputs}
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
                onRequestResetTimer={(cutId, quantityIndex) => setPendingReset({ cutId, quantityIndex })}
                onRequestShiftOver={(cutId, quantityIndex) => { void handleImmediateOperatorAction(cutId, quantityIndex, "shiftOver"); }}
                onRequestResume={(cutId, quantityIndex) => { void handleImmediateOperatorAction(cutId, quantityIndex, "resume"); }}
                onRequestEndTimeCapture={(cutId, quantityIndex) => setPendingEndTimeCapture({ cutId, quantityIndex })}
                onStartTimeCaptured={handleStartTimeCaptured}
                isAdmin={isAdmin}
                canRunAssignedJob={isCurrentUserAssignedToJob(cutItem.assignedTo, currentUserDisplayName, isAdmin)}
                runBlockedReason="Your name must be assigned to this job before you can run it."
              />
            );
          })}
        </div>
      </div>

      <OperatorTotalsSection
        groupEstimatedHrs={groupEstimatedHrs}
        totalWedmAmount={totalWedmAmount}
        totalSedmAmount={totalSedmAmount}
        groupTotalAmount={groupTotalAmount}
        isAdmin={isAdmin}
        overtimeSeconds={groupOvertimeSeconds}
      />
    </>
  );
};

export default OperatorViewBody;
