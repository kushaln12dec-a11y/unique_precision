type IdleOption = {
  idleTimeType: string;
  requiresReason?: boolean;
};

type OperatorTaskTimerPanelProps = {
  elapsedText: string;
  idleReason: string;
  otherIdleReason: string;
  improperJobReason: string;
  remark: string;
  savingTimer: boolean;
  idleOptions: IdleOption[];
  onIdleReasonChange: (value: string) => void;
  onOtherReasonChange: (value: string) => void;
  onImproperJobReasonChange: (value: string) => void;
  onRemarkChange: (value: string) => void;
  onSave: () => void;
};

const OperatorTaskTimerPanel = ({
  elapsedText,
  idleReason,
  otherIdleReason,
  improperJobReason,
  remark,
  savingTimer,
  idleOptions,
  onIdleReasonChange,
  onOtherReasonChange,
  onImproperJobReasonChange,
  onRemarkChange,
  onSave,
}: OperatorTaskTimerPanelProps) => {
  const selectedOption = idleOptions.find((o) => o.idleTimeType === idleReason);
  const requiresExtraReason = selectedOption?.requiresReason === true;
  const isOthers = idleReason === "Others";

  return (
    <div className="operator-inline-timer-panel">
      <div className="operator-inline-timer-panel-head">
        <span>Task Switch Timer</span>
        <span className="live">{elapsedText}</span>
      </div>
      <div className="filter-group">
        <label htmlFor="operator-idle-reason">Idle Time</label>
        <select id="operator-idle-reason" value={idleReason} onChange={(e) => onIdleReasonChange(e.target.value)} className="filter-select">
          <option value="">Select</option>
          {idleOptions.map((opt) => (
            <option key={opt.idleTimeType} value={opt.idleTimeType}>
              {opt.idleTimeType}
            </option>
          ))}
          {!idleOptions.some((o) => o.idleTimeType === "Others") && <option value="Others">Others</option>}
        </select>
      </div>

      {requiresExtraReason && (
        <div className="filter-group">
          <label htmlFor="operator-improper-job-reason" className="operator-timer-required-label">
            Reason <span className="operator-timer-required-star" aria-label="required">*</span>
          </label>
          <textarea
            id="operator-improper-job-reason"
            value={improperJobReason}
            onChange={(e) => onImproperJobReasonChange(e.target.value)}
            placeholder="Enter reason for improper job placement..."
            className="filter-input operator-inline-timer-input operator-timer-reason-textarea"
            rows={3}
          />
        </div>
      )}

      {isOthers && (
        <div className="filter-group">
          <label htmlFor="operator-idle-other-reason">Other Reason</label>
          <input id="operator-idle-other-reason" type="text" value={otherIdleReason} onChange={(e) => onOtherReasonChange(e.target.value)} placeholder="Enter reason..." className="filter-input operator-inline-timer-input" />
        </div>
      )}

      <div className="filter-group">
        <label htmlFor="operator-idle-remark">Remark</label>
        <input id="operator-idle-remark" type="text" value={remark} onChange={(e) => onRemarkChange(e.target.value)} placeholder="Enter remark..." className="filter-input operator-inline-timer-input" />
      </div>
      <div className="operator-inline-timer-actions">
        <button type="button" className="operator-inline-timer-save-btn" onClick={onSave} disabled={savingTimer}>
          {savingTimer ? "Saving..." : "Save & Stop"}
        </button>
      </div>
    </div>
  );
};

export default OperatorTaskTimerPanel;
