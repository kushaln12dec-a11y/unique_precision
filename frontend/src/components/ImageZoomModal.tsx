import React, { useEffect } from "react";
import "./ImageZoomModal.css";

type ImageZoomModalProps = {
  imageSrc: string;
  onClose: () => void;
};

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageSrc, onClose }) => {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="image-zoom-modal-overlay" onClick={onClose}>
      <div className="image-zoom-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-zoom-close-btn" onClick={onClose} aria-label="Close zoomed image">
          ×
        </button>
        <img src={imageSrc} alt="Zoomed" className="image-zoom-img" />
      </div>
    </div>
  );
};

export default ImageZoomModal;
