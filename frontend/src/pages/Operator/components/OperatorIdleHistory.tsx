import React from "react";
import { getServerNowMs } from "../../../services/serverTime";
import { formatIdleDuration } from "../utils/operatorTimeUtils";
import type { PauseSession } from "../types/cutInput";

type Props = {
  pauseSessions: PauseSession[];
  isPaused?: boolean;
  pauseStartTime?: number | null;
  currentPauseReason?: string;
  currentPauseOperatorName?: string;
};

const OperatorIdleHistory: React.FC<Props> = ({
  pauseSessions,
  isPaused = false,
  pauseStartTime = null,
  currentPauseReason = "",
  currentPauseOperatorName = "",
}) => {
  const completedSessions = pauseSessions
    .filter((session) => Boolean(session.pauseEndTime) && Number(session.pauseDuration || 0) > 0)
    .sort((left, right) => Number(right.pauseStartTime || 0) - Number(left.pauseStartTime || 0));
  const activePauseDuration =
    isPaused && pauseStartTime ? Math.max(0, Math.floor((getServerNowMs() - pauseStartTime) / 1000)) : 0;
  const holdEntries = [
    ...(isPaused && activePauseDuration > 0
      ? [{
          reason: String(currentPauseReason || "Idle").trim() || "Idle",
          operatorName: String(currentPauseOperatorName || "").trim() || "Unknown",
          duration: activePauseDuration,
          isActive: true,
        }]
      : []),
    ...completedSessions.map((session) => ({
      reason: String(session.reason || "Idle").trim() || "Idle",
      operatorName: String(session.operatorName || "").trim() || "Unknown",
      duration: Math.max(0, Number(session.pauseDuration || 0)),
      isActive: false,
    })),
  ];

  if (!holdEntries.length) return null;

  return (
    <div className="idle-history-inline-section">
      <div className="idle-history-inline-list">
        {holdEntries.map((entry, sessionIndex) => (
          <div key={`${entry.operatorName}-${entry.reason}-${sessionIndex}`} className={`idle-history-inline-item ${entry.isActive ? "active" : ""}`.trim()}>
            <span className="idle-history-inline-reason">{entry.reason}</span>
            <span className="idle-history-inline-meta">
              <span className="idle-history-inline-label">{entry.operatorName}</span>
              <span className="idle-history-inline-separator" />
              <span className="idle-history-inline-duration">{formatIdleDuration(entry.duration)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperatorIdleHistory;
