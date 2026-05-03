import React from "react";

const IDLE_REASON_OPTIONS = ["Power Break", "Machine Breakdown", "Vertical Dial", "Cleaning", "Consumables Change", "Others"];

type Props = {
  canOperateInputs: boolean;
  currentPauseReason: string;
  isShiftOverPause: boolean;
  pauseReasonError?: string;
  onPauseReasonChange: (value: string) => void;
};

const OperatorPauseReasonCard: React.FC<Props> = ({
  canOperateInputs,
  currentPauseReason,
  isShiftOverPause,
  pauseReasonError,
  onPauseReasonChange,
}) => (
  <div className="operator-input-card pause-reason-card">
    <label>Idle Reason <span style={{ color: "#ef4444" }}>*</span></label>
    {isShiftOverPause ? (
      <div className="pause-reason-fixed-tag">Shift Over</div>
    ) : (
      <select
        value={currentPauseReason || ""}
        onChange={(e) => onPauseReasonChange(e.target.value)}
        className={`pause-reason-input ${pauseReasonError ? "input-error" : ""}`}
        disabled={!canOperateInputs}
      >
        <option value="">Select reason</option>
        {IDLE_REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
      </select>
    )}
    {pauseReasonError && <p className="field-error">{pauseReasonError}</p>}
  </div>
);

export default OperatorPauseReasonCard;
