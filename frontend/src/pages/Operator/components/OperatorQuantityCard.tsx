import React from "react";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DateTimeInput from "./DateTimeInput";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "./MultiSelectOperators";
import OperatorQuantityActions from "./OperatorQuantityActions";
import OperatorQuantityHistoryPanel from "./OperatorQuantityHistoryPanel";
import { decimalHoursToHHMM } from "../utils/machineHrsCalculation";
import { useQuantityTimer } from "../hooks/useQuantityTimer";
import { getQaStageLabel, type QuantityProgressStatus } from "../utils/qaProgress";
import { estimatedDurationSecondsFromHours, formatMachineLabel } from "../../../utils/jobFormatting";
import { formatIdleDuration } from "../utils/operatorTimeUtils";
import type { QuantityInputData } from "../types/cutInput";
import type { OperatorInputField } from "../types/inputFields";
import { getOperatorQuantityHistory } from "../utils/operatorQuantityHistory";

const IDLE_REASON_OPTIONS = ["Power Break", "Machine Breakdown", "Vertical Dial", "Cleaning", "Consumables Change", "Others"];

type Props = {
  qtyData: QuantityInputData;
  qtyIndex: number;
  cutId: number | string;
  isRangeMode: boolean;
  isRangeValid: boolean;
  rangeStartQty: number;
  rangeEndQty: number;
  isRangeApproved: boolean;
  getStatus: (qty: number) => QuantityProgressStatus;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  canEditAssignments: boolean;
  canOperateInputs: boolean;
  onInputChange: (cutId: number | string, quantityIndex: number, field: OperatorInputField, value: string | string[]) => void;
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onStartTimeCaptured?: (cutId: number | string, quantityIndex: number) => void;
  validationErrors?: Record<string, string>;
  requiredHoursPerQuantity: number;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  onRequestShiftOver?: (cutId: number | string, quantityIndex: number) => void;
  onRequestResume?: (cutId: number | string, quantityIndex: number) => void;
  onRequestEndTimeCapture?: (cutId: number | string, quantityIndex: number) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  onSaveRange?: (cutId: number | string, sourceQuantityIndex: number, fromQty: number, toQty: number) => void;
  savedRanges: Set<string>;
  canReset: boolean;
};

export const OperatorQuantityCard: React.FC<Props> = ({
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
    qtyData.totalPauseTime || 0,
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
  const estimatedTimerLabel = hasOvertime ? "Overtime:" : "Remaining Time:";

  return (
    <div className="quantity-input-group">
      <div className="quantity-header">
        <div className="quantity-title-row">
          <h6 className="quantity-label">{isRangeMode && isRangeValid ? `Quantity ${rangeStartQty}-${rangeEndQty}` : `Quantity ${qtyIndex + 1}`}</h6>
          {!isRangeMode && <span className={`range-status-badge status-${getStatus(qtyIndex + 1).toLowerCase()}`}>{getQaStageLabel(getStatus(qtyIndex + 1))}</span>}
          {isRangeMode && isRangeValid && <span className={`range-status-badge ${isRangeApproved ? "approved" : "pending"}`}>{isRangeApproved ? "Confirmed" : "Selected"}</span>}
        </div>
        {qtyData.startTime && (
          <div className="quantity-timers">
            {((qtyData.isPaused || Number(qtyData.totalPauseTime || 0) > 0) && pauseTime && pauseTime !== "00:00:00") && <div className="quantity-timer idle-timer"><span className="timer-label">Idle Time:</span><span className={`timer-value ${isRunning ? "running" : ""}`}>{pauseTime}</span></div>}
            <div className={`quantity-timer required-timer ${hasOvertime ? "overtime-timer" : ""}`.trim()}><span className="timer-label">{estimatedTimerLabel}</span><span className={`timer-value ${hasOvertime ? "overtime" : isRunning ? "running" : ""}`.trim()}>{hasOvertime ? overtimeTime : remainingTime}</span></div>
            <div className="quantity-timer"><span className="timer-label">Running Time:</span><span className={`timer-value ${isRunning ? "running" : ""}`}>{elapsedTime}</span></div>
          </div>
        )}
      </div>

      <div className="quantity-content-wrapper">
        <div className="operator-inputs-grid">
          <div className="operator-input-card">
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
                      if (!qtyData.endTime && !isShiftOverPause) onInputChange(cutId, qtyIndex, "togglePause", "");
                    }}
                    disabled={!!qtyData.endTime || isShiftOverPause}
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
              onChange={(value) => { if (!qtyData.startTime && !qtyData.endTime) onInputChange(cutId, qtyIndex, "startTime", value); }}
              onTimeCapture={(timestampMs) => {
                if (!canOperateInputs) return;
                if (!qtyData.startTime && !qtyData.endTime) {
                  onInputChange(cutId, qtyIndex, "startTimeEpochMs", String(timestampMs));
                  onStartTimeCaptured?.(cutId, qtyIndex);
                  onShowToast?.("Start time captured successfully!", "success");
                } else {
                  onShowToast?.("Start time can only be set once!", "error");
                }
              }}
              placeholder="DD/MM/YYYY HH:MM"
              error={validationErrors.startTime}
              showPauseButton={true}
              showPauseButtonInInput={false}
              isPaused={qtyData.isPaused || false}
              onPauseToggle={() => { if (canOperateInputs && !qtyData.endTime && !isShiftOverPause) onInputChange(cutId, qtyIndex, "togglePause", ""); }}
              disablePauseButton={!canOperateInputs || !!qtyData.endTime || isShiftOverPause}
              disabled={!canOperateInputs || !!qtyData.startTime || !!qtyData.endTime}
            />
          </div>
          <div className="operator-input-card">
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
              onTimeCapture={() => {
                if (!canOperateInputs) return;
                if (!qtyData.endTime) {
                  onRequestEndTimeCapture?.(cutId, qtyIndex);
                } else {
                  onShowToast?.("End time can only be set once!", "error");
                }
              }}
              placeholder="DD/MM/YYYY HH:MM"
              error={validationErrors.endTime}
              disabled={!canOperateInputs || !!qtyData.endTime}
            />
          </div>
          <div className="operator-input-card">
            <label>Machine Hrs</label>
            <input type="text" value={qtyData.machineHrs ? decimalHoursToHHMM(parseFloat(qtyData.machineHrs)) : "00:00"} readOnly placeholder="00:00" className="readonly-input machine-hrs-input" />
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
          </div>
          {qtyData.isPaused && !qtyData.endTime && (
            <div className="operator-input-card pause-reason-card">
              <label>Idle Reason <span style={{ color: "#ef4444" }}>*</span></label>
              {isShiftOverPause ? (
                <div className="pause-reason-fixed-tag">Shift Over</div>
              ) : (
                <select value={qtyData.currentPauseReason || ""} onChange={(e) => onInputChange(cutId, qtyIndex, "pauseReason", e.target.value)} className={`pause-reason-input ${validationErrors.pauseReason ? "input-error" : ""}`} disabled={!canOperateInputs}>
                  <option value="">Select reason</option>
                  {IDLE_REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              )}
              {validationErrors.pauseReason && <p className="field-error">{validationErrors.pauseReason}</p>}
            </div>
          )}
        </div>

        <OperatorQuantityHistoryPanel
          isRangeMode={isRangeMode}
          latestWorkedByName={latestWorkedByName}
          operatorHistoryDetails={operatorHistoryDetails}
          shouldShowOperatorHistory={shouldShowOperatorHistory}
          shouldShowWorkedBySummary={shouldShowWorkedBySummary}
          formatWorkedDuration={formatWorkedDuration}
        />
      </div>

      {qtyData.pauseSessions && qtyData.pauseSessions.length > 0 ? (
        <div className="idle-history-inline-section">
          <div className="idle-history-inline-header">
            <span className="idle-history-inline-title">Idle Time</span>
            <span className="idle-history-inline-count">{qtyData.pauseSessions.length}</span>
          </div>
          <div className="idle-history-inline-list">
            {qtyData.pauseSessions.map((session, sessionIndex) => (
              <div key={sessionIndex} className="idle-history-inline-item">
                <span className="idle-history-inline-index">#{sessionIndex + 1}</span>
                <span className="idle-history-inline-duration">{formatIdleDuration(session.pauseDuration)}</span>
                {session.operatorName ? <span className="idle-history-inline-user">{session.operatorName}</span> : null}
                <span className="idle-history-inline-reason">{session.reason || "Idle"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <OperatorQuantityActions
        canOperateInputs={canOperateInputs}
        canReset={canReset}
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
      />
    </div>
  );
};

export default OperatorQuantityCard;
