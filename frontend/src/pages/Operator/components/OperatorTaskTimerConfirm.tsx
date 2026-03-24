type OperatorTaskTimerConfirmProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const OperatorTaskTimerConfirm = ({ isOpen, onCancel, onConfirm }: OperatorTaskTimerConfirmProps) => {
  if (!isOpen) return null;
  return (
    <div className="operator-start-confirm-overlay">
      <div className="operator-start-confirm-modal">
        <div className="operator-start-confirm-head">
          <h4>Start Task Timer?</h4>
          <p>Timer will begin tracking your active operation time now.</p>
        </div>
        <div className="operator-start-confirm-actions">
          <button type="button" className="operator-start-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="operator-start-confirm-start" onClick={onConfirm}>Start Timer</button>
        </div>
      </div>
    </div>
  );
};

export default OperatorTaskTimerConfirm;
