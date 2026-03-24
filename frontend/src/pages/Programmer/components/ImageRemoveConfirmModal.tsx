import "../../../components/ConfirmDeleteModal.css";

type ImageRemoveConfirmModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ImageRemoveConfirmModal = ({
  isOpen,
  onCancel,
  onConfirm,
}: ImageRemoveConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onCancel} />
      <div className="delete-modal">
        <div className="modal-header">
          <h3>Remove Image</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            x
          </button>
        </div>
        <div className="modal-body">
          <p className="delete-warning">Are you sure you want to remove this image?</p>
          <p className="delete-note">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </>
  );
};

export default ImageRemoveConfirmModal;
