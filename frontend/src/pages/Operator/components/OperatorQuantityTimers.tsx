import React from "react";

type Props = {
  elapsedTime: string;
  pauseTime: string;
  remainingTime: string;
  overtimeTime: string;
  hasOvertime: boolean;
  isPaused: boolean;
  isRunning: boolean;
  totalPauseTime: number;
};

const OperatorQuantityTimers: React.FC<Props> = ({
  elapsedTime,
  pauseTime,
  remainingTime,
  overtimeTime,
  hasOvertime,
  isPaused,
  isRunning,
  totalPauseTime,
}) => {
  const estimatedTimerLabel = hasOvertime ? "Overtime:" : "Remaining Time:";

  return (
    <div className="quantity-timers">
      {(isPaused || totalPauseTime > 0) && (
        <div className="quantity-timer idle-timer">
          <span className="timer-label">Idle Time:</span>
          <span className={`timer-value ${isRunning ? "running" : ""}`}>{pauseTime}</span>
        </div>
      )}
      <div className={`quantity-timer required-timer ${hasOvertime ? "overtime-timer" : ""}`.trim()}>
        <span className="timer-label">{estimatedTimerLabel}</span>
        <span className={`timer-value ${hasOvertime ? "overtime" : isRunning ? "running" : ""}`.trim()}>
          {hasOvertime ? overtimeTime : remainingTime}
        </span>
      </div>
      <div className="quantity-timer">
        <span className={`timer-label`}>Running Time:</span>
        <span className={`timer-value ${isRunning ? "running" : ""}`}>{elapsedTime}</span>
      </div>
    </div>
  );
};

export default OperatorQuantityTimers;
