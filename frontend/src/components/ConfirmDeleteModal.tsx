import "./ConfirmDeleteModal.css";

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  confirmButtonText?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal = ({
  title,
  message,
  details,
  confirmButtonText = "Delete",
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) => {
  return (
    <>
      <div className="confirm-delete-overlay" onClick={isProcessing ? undefined : onCancel} />
      <div className="confirm-delete-modal">
        <div className="confirm-delete-header">
          <h3>{title}</h3>
          <button
            className="confirm-delete-close"
            onClick={onCancel}
            aria-label="Close"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="confirm-delete-body">
          <p className="delete-warning">{message}</p>
          {details.length > 0 && (
            <div className="user-details">
              {details.map((detail, index) => (
                <p key={index}>
                  <strong>{detail.label}:</strong> {detail.value}
                </p>
              ))}
            </div>
          )}
          <p className="delete-note">This action cannot be undone.</p>
        </div>

        <div className="confirm-delete-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? "Please wait..." : confirmButtonText}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmDeleteModal;
