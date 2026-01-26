import "./Toast.css";

type ToastVariant = "success" | "error" | "info";

type ToastProps = {
  message: string;
  visible: boolean;
  variant?: ToastVariant;
  onClose?: () => void;
};

const Toast = ({ message, visible, variant = "success", onClose }: ToastProps) => {
  if (!visible) return null;

  return (
    <div className={`toast toast-${variant}`} role="status" aria-live="polite">
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        {onClose && (
          <button className="toast-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
