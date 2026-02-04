/**
 * Utility functions for calculating machine hours
 */

/**
 * Calculate Machine Hours automatically based on:
 * - Start Time: When the machine operation started (DD/MM/YYYY HH:MM format)
 * - End Time: When the machine operation ended (DD/MM/YYYY HH:MM format)
 * - Idle Time Duration: Time spent idle (can be "00:20" or "HH:MM" format)
 * 
 * Formula: Machine Hrs = (End Time - Start Time) - Idle Time Duration
 */
export const calculateMachineHrs = (startTime: string, endTime: string, idleTimeDuration: string): string => {
  if (!startTime || !endTime) return "0.000";
  
  // Parse datetime strings (DD/MM/YYYY HH:mm format)
  const parseDateTime = (dateTimeStr: string): number => {
    // Try DD/MM/YYYY HH:mm format first
    const parts = dateTimeStr.split(" ");
    if (parts.length === 2) {
      const datePart = parts[0].split("/");
      const timePart = parts[1].split(":");
      if (datePart.length === 3 && timePart.length === 2) {
        const day = parseInt(datePart[0], 10) || 0;
        const month = parseInt(datePart[1], 10) || 0;
        const year = parseInt(datePart[2], 10) || 0;
        const hours = parseInt(timePart[0], 10) || 0;
        const minutes = parseInt(timePart[1], 10) || 0;
        const date = new Date(year, month - 1, day, hours, minutes);
        return date.getTime() / (1000 * 60 * 60); // Convert to hours
      }
    }
    // Fallback to HH:MM format (legacy support)
    const timeParts = dateTimeStr.split(":");
    if (timeParts.length === 2) {
      const hours = parseInt(timeParts[0], 10) || 0;
      const minutes = parseInt(timeParts[1], 10) || 0;
      return hours + minutes / 60;
    }
    return 0;
  };
  
  // Parse idle time duration (can be "00:20" or "HH:MM" format)
  const parseIdleTime = (idleStr: string): number => {
    if (!idleStr) return 0;
    // Try HH:MM format first (e.g., "00:20" for 20 minutes)
    const parts = idleStr.split(":");
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      return hours + minutes / 60;
    }
    // Check if it's in "Xmin" format (legacy support)
    if (idleStr.endsWith("min")) {
      const minutes = parseInt(idleStr.replace("min", ""), 10) || 0;
      return minutes / 60;
    }
    return 0;
  };
  
  const start = parseDateTime(startTime);
  const end = parseDateTime(endTime);
  const idle = parseIdleTime(idleTimeDuration);
  
  // Calculate difference in hours
let diff = end - start;

// Handle day rollover for time-only format
if (diff < 0 && !startTime.includes("/")) {
  diff += 24;
}

// ADD idle time instead of subtracting
const machineHrs = Math.max(0, diff + idle);

return machineHrs.toFixed(3);

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
