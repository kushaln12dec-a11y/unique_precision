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

  const primaryEntry = fallbackEntries[fallbackEntries.length - 1] || null;
  const additionalCount = Math.max(0, fallbackEntries.length - 1);
  const tooltipText = fallbackEntries
    .map((entry) => `${entry.name}${entry.durationSeconds > 0 ? `: ${formatWorkedDuration(entry.durationSeconds)}` : ""}`)
    .join(" | ");

  void isAdmin;

  return (
    <div className="quantity-side-panel">
      {primaryEntry && (!isRangeMode || operatorHistoryDetails.length > 0) && !shouldShowWorkedBySummary ? (
        <div className="operator-history-compact-card" title={tooltipText}>
          <span className="operator-history-compact-label">Worked by</span>
          <div className="operator-history-compact-main">
            <span className="operator-history-compact-avatar">{primaryEntry.name.slice(0, 1) || "O"}</span>
            <div className="operator-history-compact-copy">
              <strong className="operator-history-compact-name">{primaryEntry.name}</strong>
              <div className="operator-history-compact-meta">
                {primaryEntry.durationSeconds > 0 ? (
                  <span className="operator-history-compact-chip">{formatWorkedDuration(primaryEntry.durationSeconds)}</span>
                ) : null}
                {additionalCount > 0 ? (
                  <span className="operator-history-compact-note">+{additionalCount} more</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OperatorQuantityHistoryPanel;
