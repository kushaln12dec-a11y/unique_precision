import React from "react";

type Props = {
  isRangeMode: boolean;
  latestWorkedByName: string;
  operatorHistoryDetails: Array<{ name: string; durationSeconds: number; revenue?: number }>;
  shouldShowOperatorHistory: boolean;
  shouldShowWorkedBySummary: boolean;
  formatWorkedDuration: (seconds: number) => string;
  isAdmin: boolean;
};

const OperatorQuantityHistoryPanel: React.FC<Props> = ({
  isRangeMode,
  latestWorkedByName,
  operatorHistoryDetails,
  shouldShowOperatorHistory,
  shouldShowWorkedBySummary,
  formatWorkedDuration,
  isAdmin,
}) => {
  if (!shouldShowOperatorHistory) return null;

  const fallbackEntries =
    operatorHistoryDetails.length > 0
      ? operatorHistoryDetails
      : latestWorkedByName
        ? [{ name: latestWorkedByName, durationSeconds: 0 }]
        : [];

  return (
    <div className="quantity-side-panel">
      <div className="operator-history-panel">
        {fallbackEntries.length > 0 && (!isRangeMode || operatorHistoryDetails.length > 0) && !shouldShowWorkedBySummary ? (
          <div
            className="operator-history-proof modern"
            title={fallbackEntries
              .map((entry) => `${entry.name}${entry.durationSeconds > 0 ? `: ${formatWorkedDuration(entry.durationSeconds)}` : ""}${isAdmin && entry.revenue ? ` | Rs. ${entry.revenue.toFixed(2)}` : ""}`)
              .join(" | ")}
          >
            <div className="operator-history-header">
              <span className="operator-history-title">Worked By</span>
              <span className="operator-history-count">{fallbackEntries.length}</span>
            </div>
            <div className="operator-history-list">
              {fallbackEntries.map((entry) => (
                <div key={`${entry.name}-${entry.durationSeconds}`} className="operator-history-item">
                  <span className="operator-history-avatar">{entry.name.slice(0, 1) || "O"}</span>
                  <div className="operator-history-meta">
                    <span className="operator-history-name">{entry.name}</span>
                    {isAdmin && entry.revenue ? (
                      <span className="operator-history-note">Rs. {entry.revenue.toFixed(2)}</span>
                    ) : null}
                  </div>
                  <span className="operator-history-duration">
                    {entry.durationSeconds > 0 ? formatWorkedDuration(entry.durationSeconds) : "Recent"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OperatorQuantityHistoryPanel;
