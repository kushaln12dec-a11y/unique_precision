import React from "react";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";

type JobFormActionsProps = {
  grandTotals: { totalHrs: number; totalAmount: number };
  allCutsSaved: boolean;
  isAdmin: boolean;
  onClearAll: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export const JobFormActions: React.FC<JobFormActionsProps> = ({
  grandTotals,
  allCutsSaved,
  isAdmin,
  onClearAll,
  onSave,
  onCancel,
}) => {
  return (
    <div className="form-actions">
      <div className="form-totals">
        <div>
          <span className="form-total-label">Total Hrs/Piece</span>
          <span className="form-total-value">{formatDecimalHoursToHHMMhrs(grandTotals.totalHrs)}</span>
        </div>
        <div>
          {isAdmin && (
            <>
              <span className="form-total-label">Total Amount (₹)</span>
              <span className="form-total-value">{grandTotals.totalAmount.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
      <div className="form-action-buttons">
        <button
          className="btn-clear-all"
          onClick={onClearAll}
        >
          Clear All
        </button>
        <button
          className="btn-success"
          onClick={onSave}
          disabled={!allCutsSaved}
        >
          Save Job
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
