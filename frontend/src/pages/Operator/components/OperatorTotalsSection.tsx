import React from "react";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";
import "../OperatorViewPage.css";

type OperatorTotalsSectionProps = {
  groupEstimatedHrs: number;
  totalWedmAmount: number;
  totalSedmAmount: number;
  groupTotalAmount: number;
  isAdmin: boolean;
};

export const OperatorTotalsSection: React.FC<OperatorTotalsSectionProps> = ({
  groupEstimatedHrs,
  totalWedmAmount,
  totalSedmAmount,
  groupTotalAmount,
  isAdmin,
}) => {
  return (
    <div className="operator-totals-section">
      <div className="operator-total-card">
        <label>Estimated Time</label>
        <span>{groupEstimatedHrs ? formatDecimalHoursToHHMMhrs(groupEstimatedHrs) : "00:00hrs"}</span>
      </div>
      {isAdmin && (
        <>
          <div className="operator-total-card">
            <label>WEDM Amount (Rs.)</label>
            <span>Rs. {totalWedmAmount.toFixed(2)}</span>
          </div>
          <div className="operator-total-card">
            <label>SEDM Amount (Rs.)</label>
            <span>Rs. {totalSedmAmount.toFixed(2)}</span>
          </div>
          <div className="operator-total-card">
            <label>Total Amount (Rs.)</label>
            <span>Rs. {groupTotalAmount ? groupTotalAmount.toFixed(2) : "0.00"}</span>
          </div>
        </>
      )}
    </div>
  );
};
