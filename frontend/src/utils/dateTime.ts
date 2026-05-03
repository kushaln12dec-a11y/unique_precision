const IST_OFFSET_MINUTES = 5 * 60 + 30;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

/**
 * Get current date and time in IST (Indian Standard Time) format
 * 
 * HOW IT WORKS:
 * =============
 * This function captures the current moment in time and displays it in IST (Indian Standard Time).
 * 
 * STEP-BY-STEP PROCESS:
 * 1. Gets the current moment in time
 * 2. Uses Intl.DateTimeFormat with 'Asia/Kolkata' timezone to format directly in IST
 * 3. Formats the result as DD/MM/YYYY HH:MM in IST
 * 
 * NO UTC CONVERSION:
 * - This function does NOT convert to UTC
 * - It directly formats the current time in IST timezone
 * - The time is always displayed in IST format only
 * 
 * WHEN IT'S CALLED:
 * - This function is called when the user clicks the clock icon (🕐) next to "Start Time" or "End Time" fields
 * - It captures the EXACT moment the icon is clicked, ensuring accurate timestamp recording
 * - The time is always in IST regardless of the user's device timezone
 * 
 * USAGE IN OPERATOR SCREEN:
 * - Start Time: Click clock icon → captures current IST time at that moment
 * - End Time: Click clock icon → captures current IST time at that moment
 * - Machine Hrs: Automatically calculated from Start Time - End Time + Idle Time Duration
 * 
 * Returns: DD/MM/YYYY HH:MM (e.g., "29/01/2026 15:30")
 */
export const getCurrentISTDateTime = (timestampMs?: number): string => {
  const now = timestampMs ? new Date(timestampMs) : new Date();
  
  // Format directly in IST timezone using Intl API
  // This avoids any UTC conversion and shows IST time directly
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // Use 24-hour format
  });
  
  const parts = formatter.formatToParts(now);
  
  const day = parts.find(p => p.type === 'day')?.value || '01';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const hours = parts.find(p => p.type === 'hour')?.value || '00';
  const minutes = parts.find(p => p.type === 'minute')?.value || '00';
  const seconds = parts.find(p => p.type === 'second')?.value || '00';

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const parseISTDateTimeToMs = (value?: string): number | null => {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0) - IST_OFFSET_MS;
  return Number.isNaN(utcMs) ? null : utcMs;
};
  
