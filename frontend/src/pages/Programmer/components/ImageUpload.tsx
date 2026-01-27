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
  return (
    <div className="job-form-image">
      {image ? (
        <>
          <img src={image} alt={`${label} preview`} />
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
  );
};

export default ImageUpload;
