import React from "react";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DateTimeInput from "./DateTimeInput";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "./MultiSelectOperators";
import OperatorQuantityActions from "./OperatorQuantityActions";
import OperatorIdleHistory from "./OperatorIdleHistory";
import OperatorQuantityHistoryPanel from "./OperatorQuantityHistoryPanel";
import OperatorPauseReasonCard from "./OperatorPauseReasonCard";
import OperatorQuantityTimers from "./OperatorQuantityTimers";
import { decimalHoursToHHMMSS } from "../utils/machineHrsCalculation";
import { useQuantityTimer } from "../hooks/useQuantityTimer";
import { getQaStageLabel } from "../utils/qaProgress";
import { estimatedDurationSecondsFromHours, formatMachineLabel } from "../../../utils/jobFormatting";
import type { OperatorQuantityCardProps } from "../types/operatorQuantityCard";
import { getOperatorQuantityHistory } from "../utils/operatorQuantityHistory";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
export const OperatorQuantityCard: React.FC<OperatorQuantityCardProps> = ({
  qtyData,
  qtyIndex,
  cutId,
  isRangeMode,
  isRangeValid,
  rangeStartQty,
  rangeEndQty,
  isRangeApproved,
  getStatus,
  operatorUsers,
  machineOptions,
  canEditAssignments,
  canOperateInputs,
  onInputChange,
  onShowToast,
  onStartTimeCaptured,
  validationErrors = {},
  requiredHoursPerQuantity,
  onRequestResetTimer,
  onRequestShiftOver,
  onRequestResume,
  onRequestEndTimeCapture,
  onSaveQuantity,
  onSaveRange,
  savedRanges,
  canReset,
  canRunAssignedJob,
  runBlockedReason,
  isAdmin,
}) => {
  const rangeQuantityCount = isRangeMode && isRangeValid ? Math.max(1, rangeEndQty - rangeStartQty + 1) : 1;
  const quantityRequiredSeconds = estimatedDurationSecondsFromHours(
    (Number(requiredHoursPerQuantity || 0) || 0) * rangeQuantityCount
  );
  const { elapsedTime, pauseTime, remainingTime, overtimeTime, hasOvertime, isRunning } = useQuantityTimer(
    qtyData.startTime,
    qtyData.endTime,
    qtyData.isPaused || false,
    qtyData.pauseStartTime || null,
    qtyData.currentPauseReason || "",
    qtyData.totalPauseTime || 0,
    qtyData.pauseTimeOffsetSeconds || 0,
    qtyData.pausedElapsedTime || 0,
    qtyData.workedDurationSeconds || 0,
    qtyData.startTimeEpochMs || null,
    qtyData.endTimeEpochMs || null,
    quantityRequiredSeconds
  );
  const rangeBadgeKey = `${rangeStartQty}-${rangeEndQty}`;
  const isShiftOverPause = qtyData.isPaused && qtyData.currentPauseReason === "Shift Over";
  const { latestWorkedByName, operatorHistoryDetails, shouldShowOperatorHistory, shouldShowWorkedBySummary, formatWorkedDuration } =
    getOperatorQuantityHistory(qtyData, isRangeMode);

  const blockRunAction = () => {
    onShowToast?.(runBlockedReason || "Your name must be assigned to this job before you can run it.", "error");
  };

  return (
    <div className="quantity-input-group">
      <div className="quantity-header">
        <div className="quantity-title-row">
          <h6 className="quantity-label">{isRangeMode && isRangeValid ? `Quantity ${rangeStartQty}-${rangeEndQty}` : `Quantity ${qtyIndex + 1}`}</h6>
          {!isRangeMode && <span className={`range-status-badge status-${getStatus(qtyIndex + 1).toLowerCase()}`}>{getQaStageLabel(getStatus(qtyIndex + 1))}</span>}
          {isRangeMode && isRangeValid && <span className={`range-status-badge ${isRangeApproved ? "approved" : "pending"}`}>{isRangeApproved ? "Confirmed" : "Selected"}</span>}
        </div>
        {qtyData.startTime && (
          <OperatorQuantityTimers
            elapsedTime={elapsedTime}
            pauseTime={pauseTime}
            remainingTime={remainingTime}
            overtimeTime={overtimeTime}
            hasOvertime={hasOvertime}
            isPaused={qtyData.isPaused || false}
            isRunning={isRunning}
            totalPauseTime={Number(qtyData.totalPauseTime || 0)}
          />
        )}
      </div>

      <div className="quantity-content-wrapper">
        <div className="operator-inputs-grid">
          <div className="operator-input-card operator-input-card-time">
            <label className="start-time-label-row">
              <span>Start Time</span>
              {qtyData.startTime && (
                <span className="start-time-pause-meta">
                  <button
                    type="button"
                    className="start-time-pause-toggle"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canRunAssignedJob) {
                        blockRunAction();
                        return;
                      }
                      if (!qtyData.endTime && !isShiftOverPause) onInputChange(cutId, qtyIndex, "togglePause", "");
                    }}
                    disabled={!!qtyData.endTime || isShiftOverPause || !canRunAssignedJob}
                    aria-label={qtyData.isPaused ? "Resume timer" : "Idle timer"}
                    title={isShiftOverPause ? "Use Shift Over button to resume" : qtyData.isPaused ? "Resume timer" : "Idle timer"}
                  >
                    {qtyData.isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                  </button>
                </span>
              )}
            </label>
            <DateTimeInput
              value={qtyData.startTime}
              onChange={(value) => {
                const hasMachine = Boolean(String(qtyData.machineNumber || "").trim());
                const hasOperator = Array.isArray(qtyData.opsName) && qtyData.opsName.length > 0;
                if (!hasMachine || !hasOperator) {
                  onShowToast?.("Please select Machine and Operator Name before starting.", "error");
                  return;
                }
                if (!qtyData.startTime && !qtyData.endTime) onInputChange(cutId, qtyIndex, "startTime", value);
              }}
              applyCapturedValue={false}
              onTimeCapture={(timestampMs) => {
                if (!canOperateInputs) return;
                const hasMachine = Boolean(String(qtyData.machineNumber || "").trim());
                const hasOperator = Array.isArray(qtyData.opsName) && qtyData.opsName.length > 0;
                if (!hasMachine || !hasOperator) {
                  onShowToast?.("Please select Machine and Operator Name before starting.", "error");
                  return;
                }
                if (!canRunAssignedJob) {
                  blockRunAction();
                  return;
                }
                if (!qtyData.startTime && !qtyData.endTime) {
                  onStartTimeCaptured?.(cutId, qtyIndex, timestampMs);
                } else {
                  onShowToast?.("Start time can only be set once!", "error");
                }
              }}
              placeholder="DD/MM/YYYY HH:MM:SS"
              error={validationErrors.startTime}
              showPauseButton={true}
              showPauseButtonInInput={false}
              isPaused={qtyData.isPaused || false}
              onPauseToggle={() => {
                if (!canRunAssignedJob) {
                  blockRunAction();
                  return;
                }
                if (canOperateInputs && !qtyData.endTime && !isShiftOverPause) onInputChange(cutId, qtyIndex, "togglePause", "");
              }}
              disablePauseButton={!canOperateInputs || !!qtyData.endTime || isShiftOverPause || !canRunAssignedJob}
              disabled={!canOperateInputs || !!qtyData.startTime || !!qtyData.endTime || !canRunAssignedJob}
            />
          </div>
          <div className="operator-input-card operator-input-card-time">
            <label>End Time</label>
            <DateTimeInput
              value={qtyData.endTime}
              onChange={(value) => {
                if (!canOperateInputs) return;
                if (!qtyData.endTime) {
                  onInputChange(cutId, qtyIndex, "endTime", value);
                  if (qtyData.startTime && value) setTimeout(() => onInputChange(cutId, qtyIndex, "recalculateMachineHrs", ""), 100);
                }
              }}
              applyCapturedValue={false}
              onTimeCapture={(timestampMs) => {
                if (!canOperateInputs) return;
                if (!canRunAssignedJob) {
                  blockRunAction();
                  return;
                }
                if (qtyData.isPaused) {
                  onShowToast?.("Resume this quantity before capturing end time.", "error");
                  return;
                }
                if (!qtyData.endTime) {
                  onRequestEndTimeCapture?.(cutId, qtyIndex, timestampMs);
                } else {
                  onShowToast?.("End time can only be set once!", "error");
                }
              }}
              placeholder="DD/MM/YYYY HH:MM:SS"
              error={validationErrors.endTime}
              disabled={!canOperateInputs || !!qtyData.endTime || qtyData.isPaused || !canRunAssignedJob}
            />
          </div>
          <div className="operator-input-card">
            <label>Machine Hrs</label>
            <input
              type="text"
              value={qtyData.machineHrs ? decimalHoursToHHMMSS(parseFloat(qtyData.machineHrs)) : "00:00:00"}
              readOnly
              placeholder="00:00:00"
              className="readonly-input machine-hrs-input"
              title={qtyData.machineHrs ? `${decimalHoursToHHMMSS(parseFloat(qtyData.machineHrs))} (${parseFloat(qtyData.machineHrs).toFixed(3)} h)` : "00:00:00"}
            />
            {validationErrors.machineHrs && <p className="field-error">{validationErrors.machineHrs}</p>}
          </div>
          <div className="operator-input-card">
            <label>Mach #</label>
            <SelectDropdown
              value={machineOptions.includes(String(qtyData.machineNumber || "").trim()) ? String(qtyData.machineNumber || "").trim() : ""}
              onChange={(nextValue) => {
                if (!canEditAssignments) return;
                onInputChange(cutId, qtyIndex, "machineNumber", nextValue);
              }}
              options={machineOptions.map((machine) => ({ label: formatMachineLabel(machine), value: machine }))}
              placeholder="Select"
              align="left"
              className={`machine-number-select ${validationErrors.machineNumber ? "input-error" : ""}`.trim()}
              menuMinWidth={96}
              disabled={!canEditAssignments}
            />
            {validationErrors.machineNumber && <p className="field-error">{validationErrors.machineNumber}</p>}
          </div>
          <div className="operator-input-card">
            <label>Ops Name</label>
            <MultiSelectOperators
              selectedOperators={Array.isArray(qtyData.opsName) ? qtyData.opsName : []}
              availableOperators={operatorUsers}
              onChange={(nextValue) => {
                if (!canEditAssignments) return;
                onInputChange(cutId, qtyIndex, "opsName", nextValue);
              }}
              placeholder="SELECT OPERATOR"
              className={validationErrors.opsName ? "input-error" : ""}
              compact={(qtyData.opsName || []).length > 1}
              showUnassign={false}
              selfToggleOnly={false}
              disabled={!canEditAssignments}
            />
            {validationErrors.opsName && <p className="field-error">{validationErrors.opsName}</p>}
            {!canRunAssignedJob && <p className="field-error">{runBlockedReason || "Assigned operator only can run this job."}</p>}
          </div>
          {qtyData.isPaused && !qtyData.endTime && (
            <OperatorPauseReasonCard
              canOperateInputs={canOperateInputs}
              currentPauseReason={qtyData.currentPauseReason || ""}
              isShiftOverPause={isShiftOverPause}
              pauseReasonError={validationErrors.pauseReason}
              onPauseReasonChange={(value) => onInputChange(cutId, qtyIndex, "pauseReason", value)}
            />
          )}
        </div>

        <OperatorQuantityHistoryPanel
          isRangeMode={isRangeMode}
          latestWorkedByName={latestWorkedByName}
          operatorHistoryDetails={operatorHistoryDetails}
          shouldShowOperatorHistory={shouldShowOperatorHistory}
          shouldShowWorkedBySummary={shouldShowWorkedBySummary}
          formatWorkedDuration={formatWorkedDuration}
          isAdmin={isAdmin}
        />
      </div>

      <OperatorIdleHistory
        pauseSessions={qtyData.pauseSessions || []}
        isPaused={qtyData.isPaused || false}
        pauseStartTime={qtyData.pauseStartTime || null}
        currentPauseReason={qtyData.currentPauseReason || ""}
        currentPauseOperatorName={qtyData.currentPauseOperatorName || ""}
      />

      <OperatorQuantityActions
        canOperateInputs={canOperateInputs}
        canReset={canReset}
        canRunAssignedJob={canRunAssignedJob}
        runBlockedReason={runBlockedReason}
        cutId={cutId}
        qtyIndex={qtyIndex}
        isRangeMode={isRangeMode}
        isRangeValid={isRangeValid}
        isRangeApproved={isRangeApproved}
        rangeStartQty={rangeStartQty}
        rangeEndQty={rangeEndQty}
        rangeBadgeKey={rangeBadgeKey}
        savedRanges={savedRanges}
        qtyStartTime={qtyData.startTime}
        qtyEndTime={qtyData.endTime}
        isShiftOverPause={isShiftOverPause}
        isPaused={qtyData.isPaused || false}
        onShowToast={onShowToast}
        onRequestResume={onRequestResume}
        onRequestResetTimer={onRequestResetTimer}
        onRequestShiftOver={onRequestShiftOver}
        onInputChange={onInputChange}
        onSaveQuantity={onSaveQuantity}
        onSaveRange={onSaveRange}
        isAlreadySaved={["SAVED", "READY_FOR_QA", "SENT_TO_QA"].includes(getStatus(qtyIndex + 1))}
      />
    </div>
  );
};

export default OperatorQuantityCard;
