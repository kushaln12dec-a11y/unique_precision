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
      <span className="qa-legend-item empty">NOT STARTED = values not entered yet</span>
      <span className="qa-legend-item running">RUNNING = machine is cutting now</span>
      <span className="qa-legend-item ready">HOLD = captured and waiting</span>
      <span className="qa-legend-item saved">LOGGED = input captured</span>
      <span className="qa-legend-item sent">QC = moved to QC queue</span>
    </div>
  );
};

export default QaStageLegend;
