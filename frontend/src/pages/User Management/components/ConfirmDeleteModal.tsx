import type { User } from "../../../types/user";

interface ConfirmDeleteModalProps {
  user: User | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal = ({ user, onConfirm, onCancel }: ConfirmDeleteModalProps) => {
  if (!user) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onCancel} />
      <div className="delete-modal">
        <div className="modal-header">
          <h3>Confirm Delete</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="delete-warning">
            Are you sure you want to delete this user?
          </p>
          <div className="user-details">
            <p>
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
          </div>
          <p className="delete-note">This action cannot be undone.</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            Delete User
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmDeleteModal;
