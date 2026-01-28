import "./ConfirmDeleteModal.css";

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  confirmButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal = ({
  title,
  message,
  details,
  confirmButtonText = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) => {
  return (
    <>
      <div className="modal-overlay" onClick={onCancel} />
      <div className="delete-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
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

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmDeleteModal;
