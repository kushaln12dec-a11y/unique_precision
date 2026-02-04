import React from "react";

type MassDeleteButtonProps = {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
};

export const MassDeleteButton: React.FC<MassDeleteButtonProps> = ({
  selectedCount,
  onDelete,
  onClear,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      background: "#ffffff",
      padding: "1rem 1.5rem",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      zIndex: 1000
    }}>
      <span>{selectedCount} job(s) selected</span>
      <button 
        className="btn-danger"
        onClick={onDelete}
        style={{
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#ffffff",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600
        }}
      >
        Delete Selected
      </button>
      <button 
        onClick={onClear}
        style={{
          background: "#64748b",
          color: "#ffffff",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600
        }}
      >
        Clear
      </button>
    </div>
  );
};
