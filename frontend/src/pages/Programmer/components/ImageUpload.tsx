import { useEffect, useRef, useState } from "react";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ImageZoomModal from "../../../components/ImageZoomModal";
import ImageRemoveConfirmModal from "./ImageRemoveConfirmModal";
import "./ImageUpload.css";

type ImageUploadProps = {
  images: string[];
  label: string;
  onImageChange: (files: File[]) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
};

const ImageUpload = ({
  images,
  label,
  onImageChange,
  onRemove,
  readOnly = false,
}: ImageUploadProps) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length > 0) onImageChange(imageFiles);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isPasteFocused || readOnly) return;
      const files = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type.includes("image"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
      if (files.length === 0) return;
      event.preventDefault();
      handleFiles(files);
    };

    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("paste", handlePaste);
    return () => container.removeEventListener("paste", handlePaste);
  }, [isPasteFocused, readOnly]);

  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length) handleFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmRemove = () => {
    if (pendingRemoveIndex !== null) {
      onRemove(pendingRemoveIndex);
      if (currentImageIndex >= images.length - 1 && currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
      }
    }
    setShowRemoveConfirm(false);
    setPendingRemoveIndex(null);
  };

  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  return (
    <>
      <div
        ref={containerRef}
        className="job-form-image-container"
        onFocus={() => !readOnly && setIsPasteFocused(true)}
        onBlur={() => setIsPasteFocused(false)}
        tabIndex={readOnly ? -1 : 0}
        style={{ outline: isPasteFocused ? "2px solid #4a90e2" : "none", outlineOffset: "2px" }}
      >
        {!readOnly && (
          <button
            type="button"
            className="image-upload-corner-btn"
            onClick={(event) => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            aria-label="Upload image"
            title="Click to upload image"
          >
            <AttachFileIcon fontSize="small" />
          </button>
        )}

        {images.length > 0 ? (
          <div className="image-slider-wrapper">
            {images.length > 1 && (
              <>
                <button type="button" className="slider-nav-btn slider-nav-left" onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}>
                  <ChevronLeftIcon />
                </button>
                <button type="button" className="slider-nav-btn slider-nav-right" onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}>
                  <ChevronRightIcon />
                </button>
              </>
            )}

            <div className="image-slider-display">
              <img src={currentImage!} alt={`${label} preview ${currentImageIndex + 1}`} className="slider-image" />
              <div className="image-overlay">
                <button
                  type="button"
                  className="image-zoom-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setZoomedImage(currentImage!);
                  }}
                  aria-label={`Zoom image ${currentImageIndex + 1}`}
                  title="Zoom image"
                >
                  <ZoomInIcon fontSize="small" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingRemoveIndex(currentImageIndex);
                      setShowRemoveConfirm(true);
                    }}
                    aria-label={`Remove image ${currentImageIndex + 1}`}
                    title="Remove image"
                  >
                    x
                  </button>
                )}
              </div>
            </div>

            {images.length > 1 && <div className="image-counter">{currentImageIndex + 1} / {images.length}</div>}
            {!readOnly && <div className="paste-hint-container"><span className="paste-hint-text">Press Ctrl+V to Drop image</span></div>}
          </div>
        ) : (
          <div className="image-placeholder-empty">
            {readOnly ? <span>No images</span> : <div className="paste-area"><span>Press Ctrl+V to Drop image</span></div>}
          </div>
        )}

        {!readOnly && (
          <input
            ref={fileInputRef}
            className="image-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            aria-label={`Upload images for ${label}`}
            style={{ display: "none" }}
          />
        )}
      </div>

      {zoomedImage && <ImageZoomModal imageSrc={zoomedImage} onClose={() => setZoomedImage(null)} />}
      <ImageRemoveConfirmModal
        isOpen={showRemoveConfirm}
        onCancel={() => {
          setShowRemoveConfirm(false);
          setPendingRemoveIndex(null);
        }}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
};

export default ImageUpload;
