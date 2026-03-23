import React from "react";
import { estimatedHoursFromAmount, formatEstimatedTime } from "../../../utils/jobFormatting";

type JobFormActionsProps = {
  grandTotals: { totalHrs: number; totalAmount: number; wedmAmount: number; sedmAmount: number };
  allCutsSaved: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onClearAll: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export const JobFormActions: React.FC<JobFormActionsProps> = ({
  grandTotals,
  allCutsSaved,
  isAdmin,
  isSaving,
  onClearAll,
  onSave,
  onCancel,
}) => {
  return (
    <div className="form-actions">
      <div className="form-totals">
        <div>
          <span className="form-total-label">Cut Length Hrs</span>
          <span className="form-total-value">{grandTotals.totalHrs.toFixed(2)}</span>
        </div>
        <div>
          <span className="form-total-label">Estimated Time</span>
          <span className="form-total-value">{formatEstimatedTime(estimatedHoursFromAmount(grandTotals.wedmAmount))}</span>
        </div>
        {isAdmin && (
          <>
            <div>
              <span className="form-total-label">WEDM Cost (Rs.)</span>
              <span className="form-total-value">{grandTotals.wedmAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="form-total-label">SEDM Cost (Rs.)</span>
              <span className="form-total-value">{grandTotals.sedmAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="form-total-label">Total Amount (Rs.)</span>
              <span className="form-total-value">{grandTotals.totalAmount.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
      <div className="form-action-buttons">
        <button
          className="btn-clear-all"
          onClick={onClearAll}
          disabled={isSaving}
        >
          Clear All
        </button>
        <button
          className="btn-success"
          onClick={onSave}
          disabled={!allCutsSaved || isSaving}
        >
          {isSaving ? "Saving Job..." : "Save Job"}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
};
