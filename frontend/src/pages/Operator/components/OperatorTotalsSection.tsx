import React from "react";
import { formatEstimatedTime } from "../../../utils/jobFormatting";
import "../OperatorViewPage.css";

type OperatorTotalsSectionProps = {
  groupEstimatedHrs: number;
  totalWedmAmount: number;
  totalSedmAmount: number;
  groupTotalAmount: number;
  isAdmin: boolean;
  overtimeSeconds?: number;
};

export const OperatorTotalsSection: React.FC<OperatorTotalsSectionProps> = ({
  groupEstimatedHrs,
  totalWedmAmount,
  totalSedmAmount,
  groupTotalAmount,
  isAdmin,
  overtimeSeconds = 0,
}) => {
  const hasOvertime = overtimeSeconds > 0;

  return (
    <div className="operator-totals-section">
      <div className={`operator-total-card ${hasOvertime ? "overtime-card" : ""}`.trim()}>
        <label>{hasOvertime ? "Overtime" : "Estimated Time"}</label>
        <span>{hasOvertime ? formatEstimatedTime(overtimeSeconds / 3600) : formatEstimatedTime(groupEstimatedHrs)}</span>
        {hasOvertime && <small className="operator-total-meta">Estimated {formatEstimatedTime(groupEstimatedHrs)}</small>}
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
