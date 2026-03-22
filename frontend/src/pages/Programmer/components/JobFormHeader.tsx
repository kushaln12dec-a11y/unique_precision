import React from "react";
import { formatJobRefDisplay } from "../../../utils/jobFormatting";

type JobFormHeaderProps = {
  refNumber: string;
  onAddCut: () => void;
  formMode?: "draft" | "edit";
};

export const JobFormHeader: React.FC<JobFormHeaderProps> = ({ refNumber, onAddCut, formMode = "draft" }) => {
  const displayValue = formatJobRefDisplay(refNumber) || "#";
  const statusLabel = formMode === "edit" ? "Edit" : "Draft";

  return (
    <div
      className="cut-actions"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
    >
      <div
        className="ref-number-field"
        style={{ flex: 1, marginRight: "1rem", maxWidth: "300px", display: "flex", alignItems: "center" }}
      >
        <span
          style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgb(201, 223, 255)", marginRight: "0.5rem" }}
        >
          Job Number:
        </span>
        <span style={{ fontSize: "1rem", color: "rgb(255, 255, 255)", fontWeight: 500 }}>
          {displayValue}
        </span>
        <span style={{ fontSize: "0.75rem", color: "rgb(201, 223, 255)", marginLeft: "0.75rem" }}>
          {statusLabel}
        </span>
      </div>
      <button type="button" className="btn-new-job btn-add-cut" onClick={onAddCut}>
        Add New Setting
      </button>
    </div>
  );
};
