type OperatorTaskTimerPanelProps = {
  elapsedText: string;
  idleReason: string;
  otherIdleReason: string;
  remark: string;
  savingTimer: boolean;
  onIdleReasonChange: (value: string) => void;
  onOtherReasonChange: (value: string) => void;
  onRemarkChange: (value: string) => void;
  onSave: () => void;
};

const OperatorTaskTimerPanel = ({
  elapsedText,
  idleReason,
  otherIdleReason,
  remark,
  savingTimer,
  onIdleReasonChange,
  onOtherReasonChange,
  onRemarkChange,
  onSave,
}: OperatorTaskTimerPanelProps) => (
  <div className="operator-inline-timer-panel">
    <div className="operator-inline-timer-panel-head">
      <span>Task Switch Timer</span>
      <span className="live">{elapsedText}</span>
    </div>
    <div className="filter-group">
      <label htmlFor="operator-idle-reason">Idle Time</label>
      <select id="operator-idle-reason" value={idleReason} onChange={(e) => onIdleReasonChange(e.target.value)} className="filter-select">
        <option value="">Select</option>
        <option value="Power Break">Power Break</option>
        <option value="Shift Over">Shift Over</option>
        <option value="Machine Breakdown">Machine Breakdown</option>
        <option value="Vertical Dial">Vertical Dial</option>
        <option value="Cleaning">Cleaning</option>
        <option value="Consumables Change">Consumables Change</option>
        <option value="Others">Others</option>
      </select>
    </div>
    {idleReason === "Others" && (
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

export default OperatorTaskTimerPanel;
