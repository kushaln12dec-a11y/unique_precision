import { useState } from "react";
import ImageZoomModal from "../../../components/ImageZoomModal";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

type ImageUploadProps = {
  image: string | null;
  label: string;
  onImageChange: (file: File | null) => void;
  onRemove: () => void;
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  image,
  label,
  onImageChange,
  onRemove,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div className="job-form-image">
        {image ? (
          <>
            <img 
              src={image} 
              alt={`${label} preview`}
            />
            <button
              type="button"
              className="image-zoom"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsZoomed(true);
              }}
              aria-label={`Zoom image for ${label}`}
              title="Zoom image"
            >
              <ZoomInIcon fontSize="small" />
            </button>
            <button
              type="button"
              className="image-remove"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove image for ${label}`}
            >
              ×
            </button>
          </>
        ) : (
          <span className="image-placeholder">Upload Image</span>
        )}
        <input
          className="image-input"
          type="file"
          accept="image/*"
          onChange={(e) => onImageChange(e.target.files?.[0] || null)}
          aria-label={`Upload image for ${label}`}
        />
      </div>
      {isZoomed && image && (
        <ImageZoomModal imageSrc={image} onClose={() => setIsZoomed(false)} />
      )}
    </>
  );
};

export default ImageUpload;
