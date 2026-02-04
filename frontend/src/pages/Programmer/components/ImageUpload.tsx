import { useState, useRef, useEffect } from "react";
import ImageZoomModal from "../../../components/ImageZoomModal";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./ImageUpload.css";

type ImageUploadProps = {
  images: string[];
  label: string;
  onImageChange: (files: File[]) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  label,
  onImageChange,
  onRemove,
  readOnly = false,
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isPasteFocused || readOnly) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("paste", handlePaste);
      return () => {
        container.removeEventListener("paste", handlePaste);
      };
    }
  }, [isPasteFocused, readOnly]);

  // Reset to first image when images array changes
  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  const handleFiles = async (files: File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    onImageChange(imageFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readOnly && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleContainerFocus = () => {
    if (!readOnly) {
      setIsPasteFocused(true);
    }
  };

  const handleContainerBlur = () => {
    setIsPasteFocused(false);
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  return (
    <>
      <div
        ref={containerRef}
        className="job-form-image-container"
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        tabIndex={readOnly ? -1 : 0}
        style={{
          outline: isPasteFocused ? "2px solid #4a90e2" : "none",
          outlineOffset: "2px",
        }}
      >
        {/* Small Upload Icon in Corner */}
        {!readOnly && (
          <button
            type="button"
            className="image-upload-corner-btn"
            onClick={handleUploadClick}
            aria-label="Upload image"
            title="Click to upload image"
          >
            <AttachFileIcon fontSize="small" />
          </button>
        )}

        {images.length > 0 ? (
          <div className="image-slider-wrapper">
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="slider-nav-btn slider-nav-left"
                  onClick={handlePrevious}
                  aria-label="Previous image"
                  title="Previous image"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="slider-nav-btn slider-nav-right"
                  onClick={handleNext}
                  aria-label="Next image"
                  title="Next image"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}

            {/* Current Image Display */}
            <div className="image-slider-display">
              <img 
                src={currentImage!} 
                alt={`${label} preview ${currentImageIndex + 1}`}
                className="slider-image"
              />
              <div className="image-overlay">
                <button
                  type="button"
                  className="image-zoom-btn"
                  onClick={(e) => {
                    e.stopPropagation();
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(currentImageIndex);
                      if (currentImageIndex >= images.length - 1 && currentImageIndex > 0) {
                        setCurrentImageIndex(currentImageIndex - 1);
                      }
                    }}
                    aria-label={`Remove image ${currentImageIndex + 1}`}
                    title="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="image-counter">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Paste Hint */}
            {!readOnly && (
              <div className="paste-hint-container">
                <span className="paste-hint-text">Press Ctrl+V to paste image</span>
              </div>
            )}
          </div>
        ) : (
          <div className="image-placeholder-empty">
            {readOnly ? (
              <span>No images</span>
            ) : (
              <div className="paste-area">
                <span>Press Ctrl+V to paste image</span>
              </div>
            )}
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
      {zoomedImage && (
        <ImageZoomModal imageSrc={zoomedImage} onClose={() => setZoomedImage(null)} />
      )}
    </>
  );
};

export default ImageUpload;
