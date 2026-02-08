import React from "react";

type JobFormHeaderProps = {
  refNumber: string;
  onAddCut: () => void;
};

export const JobFormHeader: React.FC<JobFormHeaderProps> = ({ refNumber, onAddCut }) => {
  return (
    <div className="cut-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <div className="ref-number-field" style={{ flex: 1, marginRight: "1rem", maxWidth: "300px", display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgb(201, 223, 255)", marginRight: "0.5rem" }}>Ref Number:</span>
        <span style={{ fontSize: "1rem", color: "rgb(255, 255, 255)", fontWeight: 500 }}>
          #{refNumber || "—"}
        </span>
      </div>
      <button className="btn-new-job btn-add-cut" onClick={onAddCut}>
        Add new setting
      </button>
    </div>
  );
};
