import React, { useEffect, useState } from "react";
import DateTimeInput from "./DateTimeInput";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import { MultiSelectOperators } from "./MultiSelectOperators";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { decimalHoursToHHMM } from "../utils/machineHrsCalculation";
import { useQuantityTimer } from "../hooks/useQuantityTimer";
import type { QuantityProgressStatus } from "../utils/qaProgress";
import { getQaStageLabel } from "../utils/qaProgress";
import "../OperatorViewPage.css";

type InputField = keyof QuantityInputData | "recalculateMachineHrs" | "addIdleTimeToMachineHrs" | "togglePause" | "resetTimer" | "pauseReason";

type OperatorInputSectionProps = {
  cutData: CutInputData;
  cutId: number | string;
  quantity: number;
  operatorUsers: Array<{ id: string | number; name: string }>;
  onInputChange: (
    cutId: number | string,
    quantityIndex: number,
    field: InputField,
    value: string | string[]
  ) => void;
  onApplyToAllQuantities: (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number
  ) => void;
  onApplyToCountQuantities: (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number,
    quantityCount: number
  ) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  onSaveRange?: (
    cutId: number | string,
    sourceQuantityIndex: number,
    fromQty: number,
    toQty: number
  ) => void;
  qaStatuses?: Record<number, QuantityProgressStatus>;
  onSendToQa?: (cutId: number | string, quantityNumbers: number[]) => void;
  savedQuantities?: Set<number>; // Track which quantities are saved
  savedRanges?: Set<string>;
  validationErrors?: Record<string, Record<string, string>>; // quantityIndex -> field -> error
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  isAdmin: boolean;
};

// Helper function to format pause duration
const formatPauseDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export const OperatorInputSection: React.FC<OperatorInputSectionProps> = ({
  cutData,
  cutId,
  quantity,
  operatorUsers,
  onInputChange,
  onApplyToAllQuantities: _onApplyToAllQuantities,
  onApplyToCountQuantities: _onApplyToCountQuantities,
  onSaveQuantity,
  onSaveRange,
  qaStatuses = {},
  onSendToQa,
  savedQuantities = new Set(),
  savedRanges = new Set(),
  validationErrors = {},
  onShowToast,
  onRequestResetTimer,
  isAdmin,
}) => {
  const [captureMode, setCaptureMode] = useState<"PER_QUANTITY" | "RANGE">("PER_QUANTITY");
  const [rangeFrom, setRangeFrom] = useState<string>("1");
  const [rangeTo, setRangeTo] = useState<string>("2");
  const [isRangeApproved, setIsRangeApproved] = useState<boolean>(false);
  const [selectedQaQuantities, setSelectedQaQuantities] = useState<Set<number>>(new Set());

  // Ensure we have the right number of quantity inputs
  const quantities = cutData.quantities || [];
  const displayQuantities = Array.from({ length: Math.max(quantity, quantities.length) }, (_, i) => 
    quantities[i] || {
      startTime: "",
      startTimeEpochMs: null,
      endTime: "",
      endTimeEpochMs: null,
      machineHrs: "",
      machineNumber: "",
      opsName: [],
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
    }
  );
  const totalQuantity = Math.max(1, quantity);
  const parsedFrom = Number.parseInt(rangeFrom || "", 10);
  const parsedTo = Number.parseInt(rangeTo || "", 10);
  const isRangeFromValid = Number.isInteger(parsedFrom) && parsedFrom >= 1 && parsedFrom <= totalQuantity;
  const isRangeToValid = Number.isInteger(parsedTo) && parsedTo >= 2 && parsedTo <= totalQuantity;
  const isRangeValid = isRangeFromValid && isRangeToValid && parsedFrom <= parsedTo;
  const rangeStartQty = isRangeValid ? parsedFrom : 1;
  const rangeEndQty = isRangeValid ? parsedTo : rangeStartQty;
  const activeRangeSourceIndex = rangeStartQty - 1;
  const isRangeMode = captureMode === "RANGE";
  const rangeBadgeKey = `${rangeStartQty}-${rangeEndQty}`;
  const allQuantityNumbers = Array.from({ length: totalQuantity }, (_, i) => i + 1);
  const getStatus = (qty: number): QuantityProgressStatus => qaStatuses[qty] || "EMPTY";

  useEffect(() => {
    setRangeFrom("1");
    setRangeTo(String(Math.min(2, totalQuantity)));
    setIsRangeApproved(false);
    setSelectedQaQuantities(new Set());
  }, [totalQuantity]);

  useEffect(() => {
    setIsRangeApproved(false);
  }, [rangeFrom, rangeTo, captureMode]);

  useEffect(() => {
    setSelectedQaQuantities((prev) => {
      const next = new Set<number>();
      prev.forEach((qty) => {
        if (getStatus(qty) !== "SENT_TO_QA") next.add(qty);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qaStatuses]);

  const selectableQuantityNumbers = allQuantityNumbers.filter((qty) => getStatus(qty) !== "SENT_TO_QA");
  const qaCounts = allQuantityNumbers.reduce(
    (acc, qty) => {
      const status = getStatus(qty);
      if (status === "SENT_TO_QA") {
        acc.sent += 1;
      } else if (status === "SAVED" || status === "READY_FOR_QA") {
        acc.logged += 1;
      } else {
        acc.empty += 1;
      }
      return acc;
    },
    { logged: 0, sent: 0, empty: 0 }
  );
  const selectedNumbers = Array.from(selectedQaQuantities);
  const sendEligible = selectedNumbers.filter((qty) => {
    const status = getStatus(qty);
    return status === "SAVED" || status === "READY_FOR_QA";
  });

  return (
    <div className="operator-cut-inputs-section" data-cut-id={cutId}>
      <div className="operator-inputs-title-row">
        <h5 className="operator-inputs-title">Input Values</h5>
        <div className="qa-stage-legend qa-title-legend">
          <span className="qa-legend-title">Stage Legend:</span>
          <span className="qa-legend-item saved">Operation Logged = input captured</span>
          <span className="qa-legend-item sent">QA Dispatched = moved to QA queue</span>
          <span className="qa-legend-item empty">Pending Input = values not entered yet</span>
        </div>
      </div>
      {quantity > 1 && (
        <div className="capture-mode-toggle">
          <button
            type="button"
            className={`capture-mode-button ${captureMode === "PER_QUANTITY" ? "active" : ""}`}
            onClick={() => {
              setCaptureMode("PER_QUANTITY");
              setIsRangeApproved(false);
            }}
          >
            Per Quantity
          </button>
          <button
            type="button"
            className={`capture-mode-button ${captureMode === "RANGE" ? "active" : ""}`}
            onClick={() => {
              setCaptureMode("RANGE");
              setIsRangeApproved(false);
            }}
          >
            Range
          </button>
          {captureMode === "RANGE" && (
            <div className="capture-range-controls">
              <input
                type="number"
                min={1}
                max={totalQuantity}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                onBlur={(e) => {
                  const v = Number.parseInt(e.target.value || "", 10);
                  if (!Number.isInteger(v)) return;
                  const bounded = Math.max(1, Math.min(totalQuantity, v));
                  setRangeFrom(String(bounded));
                }}
                placeholder="From"
                className="apply-count-input"
              />
              <span className="capture-range-separator">to</span>
              <input
                type="number"
                min={2}
                max={totalQuantity}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                onBlur={(e) => {
                  const v = Number.parseInt(e.target.value || "", 10);
                  if (!Number.isInteger(v)) return;
                  const bounded = Math.max(2, Math.min(totalQuantity, v));
                  setRangeTo(String(bounded));
                }}
                placeholder="To"
                className="apply-count-input"
              />
              <span className="capture-range-hint">
                {isRangeValid
                  ? `Qty ${rangeStartQty}-${rangeEndQty} (${rangeEndQty - rangeStartQty + 1})`
                  : `Select range 1-${totalQuantity}`}
              </span>
              <button
                type="button"
                className={`range-approve-button ${isRangeApproved ? "approved" : ""}`}
                disabled={!isRangeValid}
                onClick={() => {
                  setIsRangeApproved(true);
                  if (onShowToast) {
                    onShowToast(`Range ${rangeStartQty}-${rangeEndQty} accepted.`, "success");
                  }
                }}
                title="Approve selected range"
                aria-label="Approve selected range"
              >
                {isRangeApproved ? <><span className="tick-mark">✓</span> Accepted</> : <>Check <span className="tick-mark">✓</span></>}
              </button>
            </div>
          )}
          <div className="qa-inline-status-block">
            <div className="qa-overall-summary qa-inline-summary">
              <span className="qa-summary-chip saved">Operation Logged: {qaCounts.logged}</span>
              <span className="qa-summary-chip sent">QA Dispatched: {qaCounts.sent}</span>
              <span className="qa-summary-chip empty">Pending Input: {qaCounts.empty}</span>
            </div>
          </div>
        </div>
      )}
      <div className="qa-selection-strip">
        <div className="qa-strip-head">
          <label className="qa-select-all">
            <input
              type="checkbox"
              checked={
                selectableQuantityNumbers.length > 0 &&
                selectableQuantityNumbers.every((qty) => selectedQaQuantities.has(qty))
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQaQuantities(new Set(selectableQuantityNumbers));
                } else {
                  setSelectedQaQuantities(new Set());
                }
              }}
            />
            <span>Select All</span>
          </label>
          <div className="qa-strip-actions">
            <button
              type="button"
              className="qa-action-button sent"
              disabled={sendEligible.length === 0}
              onClick={() => {
                if (onSendToQa) onSendToQa(cutId, sendEligible);
              }}
            >
              Dispatch To QA
            </button>
          </div>
        </div>
        <div className="qa-quantity-list">
          {allQuantityNumbers.map((qtyNo) => (
            <label key={qtyNo} className={`qa-qty-pill status-${getStatus(qtyNo).toLowerCase()}`}>
              <input
                type="checkbox"
                disabled={getStatus(qtyNo) === "SENT_TO_QA"}
                checked={selectedQaQuantities.has(qtyNo)}
                onChange={(e) => {
                  if (getStatus(qtyNo) === "SENT_TO_QA") return;
                  setSelectedQaQuantities((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(qtyNo);
                    else next.delete(qtyNo);
                    return next;
                  });
                }}
              />
              <span>Q{qtyNo}</span>
            </label>
          ))}
        </div>
      </div>
      
      {displayQuantities.map((qtyData, qtyIndex) => {
        const { elapsedTime, pauseTime, isRunning } = useQuantityTimer(
          qtyData.startTime,
          qtyData.endTime,
          qtyData.isPaused || false,
          qtyData.pauseStartTime || null,
          qtyData.totalPauseTime || 0,
          qtyData.pausedElapsedTime || 0,
          qtyData.startTimeEpochMs || null,
          qtyData.endTimeEpochMs || null
        );

        if (isRangeMode && qtyIndex !== activeRangeSourceIndex) {
          return null;
        }
        
        return (
          <div key={qtyIndex} className="quantity-input-group">
            <div className="quantity-header">
              <div className="quantity-title-row">
                <h6 className="quantity-label">
                  {isRangeMode && isRangeValid
                    ? `Quantity ${rangeStartQty}-${rangeEndQty}`
                    : `Quantity ${qtyIndex + 1}`}
                </h6>
                {!isRangeMode && (
                  <span className={`range-status-badge status-${getStatus(qtyIndex + 1).toLowerCase()}`}>
                    {getQaStageLabel(getStatus(qtyIndex + 1))}
                  </span>
                )}
                {isRangeMode && isRangeValid && (
                  <span className={`range-status-badge ${isRangeApproved ? "approved" : "pending"}`}>
                    {isRangeApproved ? "Confirmed" : "Selected"}
                  </span>
                )}
              </div>
              {qtyData.startTime && (
                <div className="quantity-timers">
                  <div className="quantity-timer">
                    <span className="timer-label">Running Time:</span>
                    <span className={`timer-value ${isRunning ? "running" : ""}`}>
                      {elapsedTime}
                    </span>
                  </div>
                  {/* Show pause time if paused (will count up) OR if there's accumulated pause time greater than 0 */}
                  {/* Don't show if pauseTime is "00:00:00" */}
                  {((qtyData.isPaused || Number(qtyData.totalPauseTime || 0) > 0) && pauseTime && pauseTime !== "00:00:00") && (
                    <div className="quantity-timer pause-timer">
                      <span className="timer-label">Pause Time:</span>
                      <span className="timer-value pause">
                        {pauseTime}
                      </span>
                    </div>
                  )}
                  {/* Show reset button after start time is set (before or after end time) */}
                  {qtyData.startTime && isAdmin && (
                    <button
                      type="button"
                      className="reset-timer-button"
                      onClick={() => {
                        if (onRequestResetTimer) {
                          onRequestResetTimer(cutId, qtyIndex);
                        } else {
                          onInputChange(cutId, qtyIndex, "resetTimer", "");
                        }
                      }}
                      aria-label="Reset timer"
                      title="Reset timer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="quantity-content-wrapper">
            <div className="operator-inputs-grid">
            <div className="operator-input-card">
              <label>Start Time</label>
              <DateTimeInput
                value={qtyData.startTime}
                onChange={(value) => {
                  // Only allow changes if start time is not set yet and end time is not set
                  if (!qtyData.startTime && !qtyData.endTime) {
                    onInputChange(cutId, qtyIndex, "startTime", value);
                  }
                }}
                onTimeCapture={(timestampMs) => {
                  // Only allow capture if start time is not set yet and end time is not set
                  if (!qtyData.startTime && !qtyData.endTime) {
                    onInputChange(cutId, qtyIndex, "startTimeEpochMs", String(timestampMs));
                    // Timer will automatically start when startTime is set
                    if (onShowToast) {
                      onShowToast("Start time captured successfully!", "success");
                    }
                  } else {
                    if (onShowToast) {
                      onShowToast("Start time can only be set once!", "error");
                    }
                  }
                }}
                placeholder="DD/MM/YYYY HH:MM"
                error={validationErrors[qtyIndex]?.startTime}
                showPauseButton={true}
                isPaused={qtyData.isPaused || false}
                onPauseToggle={() => {
                  // Don't allow pause toggle if end time is set
                  if (!qtyData.endTime) {
                    onInputChange(cutId, qtyIndex, "togglePause", "");
                  }
                }}
                disablePauseButton={!!qtyData.endTime}
                disabled={!!qtyData.startTime || !!qtyData.endTime}
              />
            </div>
            <div className="operator-input-card">
              <label>End Time</label>
              <DateTimeInput
                value={qtyData.endTime}
                onChange={(value) => {
                  // End time can only be set once
                  if (!qtyData.endTime) {
                    onInputChange(cutId, qtyIndex, "endTime", value);
                    // Auto-calculate machine hours when end time is set
                    if (qtyData.startTime && value) {
                      // Trigger recalculation
                      setTimeout(() => {
                        onInputChange(cutId, qtyIndex, "recalculateMachineHrs", "");
                      }, 100);
                    }
                  }
                }}
                onTimeCapture={(timestampMs) => {
                  // End time can only be set once
                  if (!qtyData.endTime) {
                    onInputChange(cutId, qtyIndex, "endTimeEpochMs", String(timestampMs));
                    if (onShowToast) {
                      onShowToast("End time captured successfully!", "success");
                    }
                  } else {
                    if (onShowToast) {
                      onShowToast("End time can only be set once!", "error");
                    }
                  }
                }}
                placeholder="DD/MM/YYYY HH:MM"
                error={validationErrors[qtyIndex]?.endTime}
                disabled={!!qtyData.endTime}
              />
            </div>
            <div className="operator-input-card">
              <label>Machine Hrs</label>
              <input
                type="text"
                value={
                  qtyData.machineHrs
                    ? decimalHoursToHHMM(parseFloat(qtyData.machineHrs))
                    : "00:00"
                }
                readOnly
                placeholder="00:00"
                className="readonly-input machine-hrs-input"
              />
              {validationErrors[qtyIndex]?.machineHrs && (
                <p className="field-error">{validationErrors[qtyIndex].machineHrs}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Mach #</label>
              <input
                type="text"
                value={qtyData.machineNumber}
                onChange={(e) =>
                  onInputChange(cutId, qtyIndex, "machineNumber", e.target.value)
                }
                placeholder="Machine Number"
                className={validationErrors[qtyIndex]?.machineNumber ? "input-error" : ""}
              />
              {validationErrors[qtyIndex]?.machineNumber && (
                <p className="field-error">{validationErrors[qtyIndex].machineNumber}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Ops Name</label>
              <MultiSelectOperators
                selectedOperators={qtyData.opsName || []}
                availableOperators={operatorUsers}
                onChange={(operators) => onInputChange(cutId, qtyIndex, "opsName", operators)}
                placeholder="Select operators..."
                className={validationErrors[qtyIndex]?.opsName ? "input-error" : ""}
              />
              {validationErrors[qtyIndex]?.opsName && (
                <p className="field-error">{validationErrors[qtyIndex].opsName}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Idle Time</label>
              <select
                value={qtyData.idleTime}
                onChange={(e) => onInputChange(cutId, qtyIndex, "idleTime", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Power Break">Power Break</option>
                <option value="Machine Breakdown">Machine Breakdown</option>
                <option value="Vertical Dial">Vertical Dial</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Consumables Change">Consumables Change</option>
              </select>
            </div>
            {qtyData.idleTime && (
              <div className="operator-input-card">
                <label>Idle Time Duration</label>
                <div className="idle-time-duration-wrapper">
                  <input
                    type="text"
                    value={qtyData.idleTimeDuration}
                    onChange={(e) =>
                      onInputChange(cutId, qtyIndex, "idleTimeDuration", e.target.value)
                    }
                    placeholder={qtyData.idleTime === "Vertical Dial" ? "00:20" : "HH:MM"}
                    readOnly={qtyData.idleTime === "Vertical Dial" || !!qtyData.endTime}
                    disabled={!!qtyData.endTime}
                    className={qtyData.idleTime === "Vertical Dial" ? "readonly-input" : ""}
                  />
                  {qtyData.idleTimeDuration && !qtyData.endTime && (
                    <>
                      <button
                        type="button"
                        className="idle-time-add-icon"
                        onClick={() => {
                          onInputChange(cutId, qtyIndex, "addIdleTimeToMachineHrs", "");
                          if (onShowToast) {
                            onShowToast("Idle time added to machine hours!", "success");
                          }
                        }}
                        aria-label="Add idle time to machine hours"
                        title="Add idle time to machine hours"
                      >
                        <AddIcon fontSize="small" />
                      </button>
                      <button
                        type="button"
                        className="idle-time-reset-icon"
                        onClick={() => onInputChange(cutId, qtyIndex, "idleTimeDuration", "")}
                        aria-label="Clear idle time duration"
                        title="Clear idle time duration"
                      >
                        <ClearIcon fontSize="small" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Pause Reason Input - Show when paused */}
            {qtyData.isPaused && !qtyData.endTime && (
              <div className="operator-input-card pause-reason-card">
                <label>Pause Reason <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  value={qtyData.currentPauseReason || ""}
                  onChange={(e) => onInputChange(cutId, qtyIndex, "pauseReason", e.target.value)}
                  placeholder="Enter reason for pause..."
                  className={`pause-reason-input ${validationErrors[qtyIndex]?.pauseReason ? "input-error" : ""}`}
                />
                {validationErrors[qtyIndex]?.pauseReason && (
                  <p className="field-error">{validationErrors[qtyIndex].pauseReason}</p>
                )}
              </div>
            )}
            
            </div>
            
            {/* Display Pause Sessions History - Right Side */}
            {qtyData.pauseSessions && qtyData.pauseSessions.length > 0 && (
              <div className="pause-history-sidebar">
                <div className="pause-history-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pause-history-icon">
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                  </svg>
                  <h6 className="pause-history-title">Pause History</h6>
                  <span className="pause-history-count">{qtyData.pauseSessions.length}</span>
                </div>
                <div className="pause-sessions-list">
                  {qtyData.pauseSessions.map((session, sessionIndex) => (
                    <div key={sessionIndex} className="pause-session-item">
                      <div className="pause-session-badge">
                        <span className="pause-session-number">#{sessionIndex + 1}</span>
                      </div>
                      <div className="pause-session-content">
                        <div className="pause-session-duration-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {formatPauseDuration(session.pauseDuration)}
                        </div>
                        {session.reason && (
                          <div className="pause-session-reason">
                            {session.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          
            {(onSaveQuantity || onSaveRange) && (
              <div className="quantity-save-section">
                {isRangeMode ? (
                  <button
                    type="button"
                    className={`btn-save-quantity ${savedRanges.has(rangeBadgeKey) ? "saved" : ""}`}
                    disabled={!isRangeValid || !isRangeApproved}
                    onClick={() => {
                      if (!isRangeValid) {
                        if (onShowToast) {
                          onShowToast(`Enter range between 1 and ${totalQuantity}.`, "error");
                        }
                        return;
                      }
                      if (!isRangeApproved) {
                        if (onShowToast) {
                          onShowToast("Please click Check to accept the range.", "error");
                        }
                        return;
                      }
                      if (onSaveRange) {
                        onSaveRange(cutId, qtyIndex, rangeStartQty, rangeEndQty);
                      }
                    }}
                  >
                    {savedRanges.has(rangeBadgeKey) ? "Saved" : `Save Range ${rangeStartQty}-${rangeEndQty}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn-save-quantity ${savedQuantities.has(qtyIndex) ? "saved" : ""}`}
                    disabled={savedQuantities.has(qtyIndex)}
                    onClick={() => {
                      if (onSaveQuantity) {
                        onSaveQuantity(cutId, qtyIndex);
                      }
                    }}
                  >
                    {savedQuantities.has(qtyIndex) ? "Saved" : "Save Quantity " + (qtyIndex + 1)}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
