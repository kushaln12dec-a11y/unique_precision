import type { QuantityInputData } from "../types/cutInput";
import { parseISTDateTimeToMs } from "../../../utils/dateTime";

export const parseOperatorDateTime = (value?: string): number | null => {
  return parseISTDateTimeToMs(value);
};

export const parseDurationToSeconds = (value?: string | null): number => {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const hmsMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const hours = Number(hmsMatch[1] || 0);
    const minutes = Number(hmsMatch[2] || 0);
    const seconds = Number(hmsMatch[3] || 0);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return Math.max(0, (hours * 3600) + (minutes * 60) + seconds);
    }
  }

  const shortMatch = raw.match(/(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i);
  if (shortMatch && shortMatch[0].trim()) {
    const hours = Number(shortMatch[1] || 0);
    const minutes = Number(shortMatch[2] || 0);
    const seconds = Number(shortMatch[3] || 0);
    return Math.max(0, (hours * 3600) + (minutes * 60) + seconds);
  }

  return 0;
};

export const formatDurationToClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const getQuantityElapsedSeconds = (quantity: QuantityInputData, nowMs: number): number => {
  const carriedWorkedSeconds = Math.max(0, Math.floor(quantity.workedDurationSeconds || 0));
  const segmentPauseSeconds = Math.max(0, Math.floor((quantity.totalPauseTime || 0) - (quantity.pauseTimeOffsetSeconds || 0)));
  const startMs =
    quantity.startTimeEpochMs && Number.isFinite(Number(quantity.startTimeEpochMs))
      ? Number(quantity.startTimeEpochMs)
      : parseOperatorDateTime(quantity.startTime);
  if (!startMs) return 0;

  const endMs =
    quantity.endTimeEpochMs && Number.isFinite(Number(quantity.endTimeEpochMs))
      ? Number(quantity.endTimeEpochMs)
      : parseOperatorDateTime(quantity.endTime);

  if (endMs) {
    const base = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const closedSegmentSeconds = Math.max(0, base - segmentPauseSeconds);
    const hasLocalEndEpoch = quantity.endTimeEpochMs && Number.isFinite(Number(quantity.endTimeEpochMs));
    if (hasLocalEndEpoch) {
      return Math.max(0, carriedWorkedSeconds + closedSegmentSeconds);
    }
    return Math.max(0, carriedWorkedSeconds || closedSegmentSeconds);
  }

  if (quantity.isPaused) return Math.max(0, Math.floor(quantity.pausedElapsedTime || carriedWorkedSeconds));

  const runningPauseSeconds =
    quantity.pauseStartTime && quantity.isPaused
      ? Math.max(0, Math.floor((nowMs - quantity.pauseStartTime) / 1000))
      : 0;
  const raw = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  return Math.max(0, carriedWorkedSeconds + raw - Math.floor(segmentPauseSeconds + runningPauseSeconds));
};

export const formatIdleDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

export const formatCompactDurationWords = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    if (minutes > 0) return `${hours} hr ${minutes} min`;
    return `${hours} hr`;
  }
  if (minutes > 0) {
    if (secs > 0) return `${minutes} min ${secs} sec`;
    return `${minutes} min`;
  }
  return `${secs} sec`;
};
