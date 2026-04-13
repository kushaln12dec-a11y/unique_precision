import React from "react";

type Props = {
  isRangeMode: boolean;
  latestWorkedByName: string;
  operatorHistoryDetails: Array<{ name: string; durationSeconds: number }>;
  operatorProofHistory: string[];
  shouldShowOperatorHistory: boolean;
  shouldShowWorkedBySummary: boolean;
  formatWorkedDuration: (seconds: number) => string;
};

const OperatorQuantityHistoryPanel: React.FC<Props> = ({
  isRangeMode,
  latestWorkedByName,
  operatorHistoryDetails,
  operatorProofHistory,
  shouldShowOperatorHistory,
  shouldShowWorkedBySummary,
  formatWorkedDuration,
}) => {
  if (!shouldShowOperatorHistory) return null;

  return (
    <div className="quantity-side-panel">
      <div className="operator-history-panel">
        {shouldShowWorkedBySummary ? (
          <div className="operator-history-proof" title={operatorProofHistory.join(", ")}>
            <span className="operator-history-proof-line">Worked By:</span>
            <span className="operator-history-proof-line">{latestWorkedByName || operatorProofHistory[0]}</span>
          </div>
        ) : null}
        {!isRangeMode && !shouldShowWorkedBySummary && latestWorkedByName ? (
          <div className="operator-history-proof" title={latestWorkedByName}>
            <span className="operator-history-proof-line">Worked By:</span>
            <span className="operator-history-proof-line">{latestWorkedByName}</span>
          </div>
        ) : null}
        {isRangeMode && operatorHistoryDetails.length > 0 ? (
          <div
            className="operator-history-proof"
            title={operatorHistoryDetails.map((entry) => `${entry.name}: ${formatWorkedDuration(entry.durationSeconds)}`).join(" | ")}
          >
            <span className="operator-history-proof-line">Worked Time:</span>
            {operatorHistoryDetails.map((entry) => (
              <span key={`${entry.name}-${entry.durationSeconds}`} className="operator-history-proof-line">
                {entry.name} ({formatWorkedDuration(entry.durationSeconds)})
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OperatorQuantityHistoryPanel;
