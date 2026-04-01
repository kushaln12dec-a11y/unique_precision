import React from "react";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DateTimeInput from "./DateTimeInput";
import { MultiSelectOperators } from "./MultiSelectOperators";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { decimalHoursToHHMM } from "../utils/machineHrsCalculation";
import { useQuantityTimer } from "../hooks/useQuantityTimer";
import { getQaStageLabel, type QuantityProgressStatus } from "../utils/qaProgress";
import { formatMachineLabel } from "../../../utils/jobFormatting";
import { formatIdleDuration } from "../utils/operatorTimeUtils";
import type { QuantityInputData } from "../types/cutInput";
import type { OperatorInputField } from "../types/inputFields";

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
  onInputChange: (cutId: number | string, quantityIndex: number, field: OperatorInputField, value: string | string[]) => void;
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onStartTimeCaptured?: (cutId: number | string, quantityIndex: number) => void;
  validationErrors?: Record<string, string>;
  requiredHoursPerQuantity: number;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  onRequestShiftOver?: (cutId: number | string, quantityIndex: number) => void;
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
  onInputChange,
  onShowToast,
  onStartTimeCaptured,
  validationErrors = {},
  requiredHoursPerQuantity,
  onRequestResetTimer,
  onRequestShiftOver,
  onSaveQuantity,
  onSaveRange,
  savedRanges,
  canReset,
}) => {
  const rangeQuantityCount = isRangeMode && isRangeValid ? Math.max(1, rangeEndQty - rangeStartQty + 1) : 1;
  const quantityRequiredSeconds = Math.max(
    0,
    Math.round((Number(requiredHoursPerQuantity || 0) || 0) * 3600 * rangeQuantityCount)
  );
  const { elapsedTime, pauseTime, remainingTime, overtimeTime, hasOvertime, isRunning } = useQuantityTimer(
    qtyData.startTime,
    qtyData.endTime,
    qtyData.isPaused || false,
    qtyData.pauseStartTime || null,
    qtyData.totalPauseTime || 0,
    qtyData.pausedElapsedTime || 0,
    qtyData.startTimeEpochMs || null,
    qtyData.endTimeEpochMs || null,
    quantityRequiredSeconds
  );
  const rangeBadgeKey = `${rangeStartQty}-${rangeEndQty}`;
  const isShiftOverPause = qtyData.isPaused && qtyData.currentPauseReason === "Shift Over";

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
            <div className={`quantity-timer required-timer ${hasOvertime ? "overtime-timer" : ""}`.trim()}><span className="timer-label">{hasOvertime ? "Overtime:" : "Estimated Time:"}</span><span className={`timer-value ${hasOvertime ? "overtime" : isRunning ? "running" : ""}`.trim()}>{hasOvertime ? overtimeTime : remainingTime}</span></div>
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
              onPauseToggle={() => { if (!qtyData.endTime && !isShiftOverPause) onInputChange(cutId, qtyIndex, "togglePause", ""); }}
              disablePauseButton={!!qtyData.endTime || isShiftOverPause}
              disabled={!!qtyData.startTime || !!qtyData.endTime}
            />
          </div>
          <div className="operator-input-card">
            <label>End Time</label>
            <DateTimeInput
              value={qtyData.endTime}
              onChange={(value) => {
                if (!qtyData.endTime) {
                  onInputChange(cutId, qtyIndex, "endTime", value);
                  if (qtyData.startTime && value) setTimeout(() => onInputChange(cutId, qtyIndex, "recalculateMachineHrs", ""), 100);
                }
              }}
              onTimeCapture={(timestampMs) => {
                if (!qtyData.endTime) {
                  onInputChange(cutId, qtyIndex, "endTimeEpochMs", String(timestampMs));
                  onShowToast?.("End time captured successfully!", "success");
                } else {
                  onShowToast?.("End time can only be set once!", "error");
                }
              }}
              placeholder="DD/MM/YYYY HH:MM"
              error={validationErrors.endTime}
              disabled={!!qtyData.endTime}
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
              onChange={(nextValue) => onInputChange(cutId, qtyIndex, "machineNumber", nextValue)}
              options={machineOptions.map((machine) => ({ label: formatMachineLabel(machine), value: machine }))}
              placeholder="Select"
              align="left"
              className={`machine-number-select ${validationErrors.machineNumber ? "input-error" : ""}`.trim()}
            />
            {validationErrors.machineNumber && <p className="field-error">{validationErrors.machineNumber}</p>}
          </div>
          <div className="operator-input-card">
            <label>Ops Name</label>
            <MultiSelectOperators selectedOperators={qtyData.opsName || []} availableOperators={operatorUsers} onChange={(operators) => onInputChange(cutId, qtyIndex, "opsName", operators)} placeholder="Select operators..." compact={true} className={validationErrors.opsName ? "input-error" : ""} />
            {validationErrors.opsName && <p className="field-error">{validationErrors.opsName}</p>}
          </div>
          {qtyData.isPaused && !qtyData.endTime && (
            <div className="operator-input-card pause-reason-card">
              <label>Idle Reason <span style={{ color: "#ef4444" }}>*</span></label>
              {isShiftOverPause ? (
                <div className="pause-reason-fixed-tag">Shift Over</div>
              ) : (
                <select value={qtyData.currentPauseReason || ""} onChange={(e) => onInputChange(cutId, qtyIndex, "pauseReason", e.target.value)} className={`pause-reason-input ${validationErrors.pauseReason ? "input-error" : ""}`}>
                  <option value="">Select reason</option>
                  {IDLE_REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              )}
              {validationErrors.pauseReason && <p className="field-error">{validationErrors.pauseReason}</p>}
            </div>
          )}
        </div>

        {qtyData.pauseSessions && qtyData.pauseSessions.length > 0 && (
          <div className="pause-history-sidebar">
            <div className="pause-history-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pause-history-icon"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" /></svg>
              <h6 className="pause-history-title">Idel Time</h6>
              <span className="pause-history-count">{qtyData.pauseSessions.length}</span>
            </div>
            <div className="pause-sessions-list">
              {qtyData.pauseSessions.map((session, sessionIndex) => (
                <div key={sessionIndex} className="pause-session-item">
                  <div className="pause-session-badge"><span className="pause-session-number">#{sessionIndex + 1}</span></div>
                  <div className="pause-session-content">
                    <div className="pause-session-duration-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      {formatIdleDuration(session.pauseDuration)}
                    </div>
                    {session.reason && <div className="pause-session-reason">{session.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="quantity-save-section">
        {isRangeMode ? (
          <button
            type="button"
            className={`btn-save-quantity ${savedRanges.has(rangeBadgeKey) ? "saved" : ""}`}
            disabled={!isRangeValid || !isRangeApproved}
            onClick={() => {
              if (!isRangeValid) return onShowToast?.(`Enter range between 1 and ${Math.max(rangeEndQty, rangeStartQty)}.`, "error");
              if (!isRangeApproved) return onShowToast?.("Please click Check to accept the range.", "error");
              onSaveRange?.(cutId, qtyIndex, rangeStartQty, rangeEndQty);
            }}
          >
            {savedRanges.has(rangeBadgeKey) ? "Saved" : `Save Range ${rangeStartQty}-${rangeEndQty}`}
          </button>
        ) : (
          <>
            {!isRangeMode && qtyData.startTime && !qtyData.endTime && (!qtyData.isPaused || isShiftOverPause) && (
              <button
                type="button"
                className="mark-shift-over-button"
                onClick={() => onRequestShiftOver?.(cutId, qtyIndex)}
              >
                {isShiftOverPause ? "Resume Quantity" : "Shift Over"}
              </button>
            )}
            {canReset && qtyData.startTime && (
              <button type="button" className="reset-timer-button" onClick={() => onRequestResetTimer ? onRequestResetTimer(cutId, qtyIndex) : onInputChange(cutId, qtyIndex, "resetTimer", "")} aria-label="Reset timer" title="Reset timer">
                Reset Quantity {qtyIndex + 1}
              </button>
            )}
            <button type="button" className="btn-save-quantity" onClick={() => onSaveQuantity?.(cutId, qtyIndex)}>
              Save Quantity {qtyIndex + 1}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OperatorQuantityCard;
