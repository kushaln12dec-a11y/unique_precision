import React from "react";
import "./QaStageLegend.css";

type QaStageLegendProps = {
  className?: string;
};

const QaStageLegend: React.FC<QaStageLegendProps> = ({ className = "" }) => {
  const classes = `qa-stage-legend qa-title-legend ${className}`.trim();

  return (
    <div className={classes}>
      <span className="qa-legend-title">Stage Legend:</span>
      <span className="qa-legend-item saved">Operation Logged = input captured</span>
      <span className="qa-legend-item sent">QA Dispatched = moved to QA queue</span>
      <span className="qa-legend-item empty">Not Started = values not entered yet</span>
    </div>
  );
};

export default QaStageLegend;
