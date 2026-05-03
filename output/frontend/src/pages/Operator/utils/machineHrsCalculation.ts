/**
 * Utility functions for calculating machine hours
 */
import { parseISTDateTimeToMs } from "../../../utils/dateTime";

/**
 * Calculate Machine Hours automatically based on:
 * - Start Time: When the machine operation started (DD/MM/YYYY HH:MM format)
 * - End Time: When the machine operation ended (DD/MM/YYYY HH:MM format)
 * - Idle Time Duration: Time spent idle (can be "00:20" or "HH:MM" format)
 * 
 * Formula: Machine Hrs = (End Time - Start Time) - Idle Time Duration
 */
const parseDateTimeToHours = (dateTimeStr: string): number => {
  const parsedDateTimeMs = parseISTDateTimeToMs(dateTimeStr);
  if (parsedDateTimeMs !== null) {
    return parsedDateTimeMs / (1000 * 60 * 60);
  }

  const timeParts = dateTimeStr.split(":");
  if (timeParts.length === 2) {
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    return hours + minutes / 60;
  }

  return 0;
};

const parseIdleTimeToHours = (idleStr: string): number => {
  if (!idleStr) return 0;
  const parts = idleStr.split(":");
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    return hours + minutes / 60 + seconds / 3600;
  }
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours + minutes / 60;
  }
  if (idleStr.endsWith("min")) {
    const minutes = parseInt(idleStr.replace("min", ""), 10) || 0;
    return minutes / 60;
  }
  return 0;
};

export const calculateMachineHrs = (
  startTime: string,
  endTime: string,
  idleTimeDuration: string,
  pauseDurationSeconds: number = 0,
  startTimeEpochMs?: number | null,
  endTimeEpochMs?: number | null,
  carriedWorkedSeconds: number = 0
): string => {
  if (!startTime || !endTime) return "0.000";

  const start =
    startTimeEpochMs && Number.isFinite(Number(startTimeEpochMs))
      ? Number(startTimeEpochMs) / (1000 * 60 * 60)
      : parseDateTimeToHours(startTime);
  const end =
    endTimeEpochMs && Number.isFinite(Number(endTimeEpochMs))
      ? Number(endTimeEpochMs) / (1000 * 60 * 60)
      : parseDateTimeToHours(endTime);
  const configuredIdleHours = parseIdleTimeToHours(idleTimeDuration);
  const pauseIdleHours = Math.max(0, Number(pauseDurationSeconds || 0)) / 3600;

  let diff = end - start;
  if (diff < 0 && !startTime.includes("/")) {
    diff += 24;
  }

  const effectiveIdleHours = configuredIdleHours + pauseIdleHours;
  const carriedWorkedHours = Math.max(0, Number(carriedWorkedSeconds || 0)) / 3600;
  return Math.max(0, carriedWorkedHours + diff - effectiveIdleHours).toFixed(3);

};

/**
 * Convert decimal hours to HH:MM format
 */
export const decimalHoursToHHMM = (decimal: number): string => {
  if (isNaN(decimal) || decimal <= 0) return "00:00";

  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};
