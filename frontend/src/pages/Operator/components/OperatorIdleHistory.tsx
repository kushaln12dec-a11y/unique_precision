import React from "react";
import { formatIdleDuration } from "../utils/operatorTimeUtils";
import type { PauseSession } from "../types/cutInput";

type Props = {
  pauseSessions: PauseSession[];
};

const OperatorIdleHistory: React.FC<Props> = ({ pauseSessions }) => {
  if (!pauseSessions.length) return null;

  return (
    <div className="idle-history-inline-section">
      <div className="idle-history-inline-header">
        <span className="idle-history-inline-title">Idle Time</span>
        <span className="idle-history-inline-count">{pauseSessions.length}</span>
      </div>
      <div className="idle-history-inline-list">
        {pauseSessions.map((session, sessionIndex) => (
          <div key={sessionIndex} className="idle-history-inline-item">
            <span className="idle-history-inline-index">#{sessionIndex + 1}</span>
            <span className="idle-history-inline-duration">{formatIdleDuration(session.pauseDuration)}</span>
            {session.operatorName ? <span className="idle-history-inline-user">{session.operatorName}</span> : null}
            <span className="idle-history-inline-reason">{session.reason || "Idle"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperatorIdleHistory;
