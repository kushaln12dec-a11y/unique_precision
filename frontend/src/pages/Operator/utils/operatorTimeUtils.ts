import type { QuantityInputData } from "../types/cutInput";

export const parseOperatorDateTime = (value?: string): number | null => {
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

export const getQuantityElapsedSeconds = (quantity: QuantityInputData, nowMs: number): number => {
  const carriedWorkedSeconds = Math.max(0, Math.floor(quantity.workedDurationSeconds || 0));
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
    return Math.max(0, carriedWorkedSeconds + base - Math.floor(quantity.totalPauseTime || 0));
  }

  if (quantity.isPaused) return Math.max(0, Math.floor(quantity.pausedElapsedTime || carriedWorkedSeconds));

  const runningPauseSeconds =
    quantity.pauseStartTime && quantity.isPaused
      ? Math.max(0, Math.floor((nowMs - quantity.pauseStartTime) / 1000))
      : 0;
  const raw = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  return Math.max(0, carriedWorkedSeconds + raw - Math.floor((quantity.totalPauseTime || 0) + runningPauseSeconds));
};

export const formatIdleDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};
