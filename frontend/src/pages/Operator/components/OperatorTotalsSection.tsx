import React from "react";
import "../OperatorViewPage.css";

type OperatorTotalsSectionProps = {
  groupTotalHrs: number;
  totalWedmAmount: number;
  totalSedmAmount: number;
  groupTotalAmount: number;
};

export const OperatorTotalsSection: React.FC<OperatorTotalsSectionProps> = ({
  groupTotalHrs,
  totalWedmAmount,
  totalSedmAmount,
  groupTotalAmount,
}) => {
  return (
    <div className="operator-totals-section">
      <div className="operator-total-card">
        <label>Total Hrs/Piece</label>
        <span>{groupTotalHrs ? groupTotalHrs.toFixed(3) : "0.000"}</span>
      </div>
      <div className="operator-total-card">
        <label>WEDM Amount (₹)</label>
        <span>₹{totalWedmAmount.toFixed(2)}</span>
      </div>
      <div className="operator-total-card">
        <label>SEDM Amount (₹)</label>
        <span>₹{totalSedmAmount.toFixed(2)}</span>
      </div>
      <div className="operator-total-card">
        <label>Total Amount (₹)</label>
        <span>₹{groupTotalAmount ? groupTotalAmount.toFixed(2) : "0.00"}</span>
      </div>
    </div>
  );
};
