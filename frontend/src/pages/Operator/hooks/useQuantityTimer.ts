import { useEffect, useMemo, useState } from "react";

const formatHMS = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const parseDateTime = (value?: string): number | null => {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

export const useQuantityTimer = (
  startTime?: string,
  endTime?: string,
  isPaused?: boolean,
  pauseStartTime?: number | null,
  totalPauseTime?: number,
  pausedElapsedTime?: number,
  workedDurationSeconds?: number,
  startTimeEpochMs?: number | null,
  endTimeEpochMs?: number | null,
  requiredDurationSeconds?: number
) => {
  const [now, setNow] = useState<number>(Date.now());

  const startMs = useMemo(
    () => (startTimeEpochMs && Number.isFinite(startTimeEpochMs) ? Number(startTimeEpochMs) : parseDateTime(startTime)),
    [startTimeEpochMs, startTime]
  );
  const endMs = useMemo(
    () => (endTimeEpochMs && Number.isFinite(endTimeEpochMs) ? Number(endTimeEpochMs) : parseDateTime(endTime)),
    [endTimeEpochMs, endTime]
  );

  const hasStarted = Boolean(startMs);
  const hasEnded = Boolean(endMs);
  const running = hasStarted && !hasEnded;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const computedElapsedSeconds = useMemo(() => {
    const carriedWorkedSeconds = Math.max(0, Math.floor(Number(workedDurationSeconds || 0)));
    if (!startMs) return 0;
    if (endMs) {
      const base = Math.max(0, Math.floor((endMs - startMs) / 1000));
      return Math.max(0, carriedWorkedSeconds + base - Math.floor(totalPauseTime || 0));
    }

    if (isPaused) {
      return Math.max(0, Math.floor(pausedElapsedTime || carriedWorkedSeconds));
    }

    const runningPauseSeconds =
      pauseStartTime && isPaused ? Math.max(0, Math.floor((now - pauseStartTime) / 1000)) : 0;
    const raw = Math.max(0, Math.floor((now - startMs) / 1000));
    return Math.max(0, carriedWorkedSeconds + raw - Math.floor((totalPauseTime || 0) + runningPauseSeconds));
  }, [startMs, endMs, isPaused, pausedElapsedTime, totalPauseTime, pauseStartTime, now, workedDurationSeconds]);

  const computedPauseSeconds = useMemo(() => {
    const base = Math.max(0, Math.floor(totalPauseTime || 0));
    if (isPaused && pauseStartTime) {
      return base + Math.max(0, Math.floor((now - pauseStartTime) / 1000));
    }
    return base;
  }, [totalPauseTime, isPaused, pauseStartTime, now]);

  const computedRemainingSeconds = useMemo(() => {
    const required = Math.max(0, Math.floor(Number(requiredDurationSeconds || 0)));
    if (required <= 0) return 0;
    return Math.max(0, required - computedElapsedSeconds);
  }, [requiredDurationSeconds, computedElapsedSeconds]);

  const computedOvertimeSeconds = useMemo(() => {
    const required = Math.max(0, Math.floor(Number(requiredDurationSeconds || 0)));
    if (required <= 0) return 0;
    return Math.max(0, computedElapsedSeconds - required);
  }, [requiredDurationSeconds, computedElapsedSeconds]);

  return {
    elapsedTime: formatHMS(computedElapsedSeconds),
    pauseTime: formatHMS(computedPauseSeconds),
    remainingTime: formatHMS(computedRemainingSeconds),
    overtimeTime: formatHMS(computedOvertimeSeconds),
    hasOvertime: computedOvertimeSeconds > 0,
    isRunning: running && !isPaused,
  };
};
