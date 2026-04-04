type OperatorActionModalProps = {
  action: "shiftOver" | "resume";
  settingNumber: number;
  quantityNumber: number;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const OperatorActionModal = ({
  action,
  settingNumber,
  quantityNumber,
  onConfirm,
  onCancel,
}: OperatorActionModalProps) => {
  const isResume = action === "resume";

  return (
    <>
      <div className="operator-action-modal-backdrop" onClick={onCancel} />
      <div className={`operator-action-modal ${isResume ? "resume" : "shift-over"}`} role="dialog" aria-modal="true">
        <div className="operator-action-modal-accent" />
        <div className="operator-action-modal-body">
          <span className="operator-action-modal-eyebrow">{isResume ? "Restart Production" : "Pause For Shift Change"}</span>
          <h3>{isResume ? "Resume this quantity?" : "Mark this quantity as shift over?"}</h3>
          <p>
            {isResume
              ? "The operator will be moved back into active work after confirmation."
              : "This will pause the running quantity and keep the current work record ready for the next operator."}
          </p>
          <div className="operator-action-modal-details">
            <div>
              <span>Setting</span>
              <strong>{settingNumber}</strong>
            </div>
            <div>
              <span>Quantity</span>
              <strong>{quantityNumber}</strong>
            </div>
          </div>
          <div className="operator-action-modal-actions">
            <button type="button" className="operator-action-secondary-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`operator-action-primary-btn ${isResume ? "resume" : "shift-over"}`}
              onClick={() => void onConfirm()}
            >
              {isResume ? "Resume Quantity" : "Confirm Shift Over"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OperatorActionModal;
