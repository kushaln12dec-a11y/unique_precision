const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => value.toString().padStart(2, "0");

const resolveDate = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsedValue = parseDateValue(value);
  if (!parsedValue) return null;
  const parsed = new Date(parsedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDisplayDate = (value: string | number | Date | null | undefined): string => {
  const date = resolveDate(value);
  if (!date) return "-";
  const day = pad(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const formatDisplayTime = (value: string | number | Date | null | undefined): string => {
  const date = resolveDate(value);
  if (!date) return "-";
  const hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const suffix = hours >= 12 ? "pm" : "am";
  return `${pad(hours)}:${minutes}${suffix}`;
};

export const formatDisplayDateTime = (value: string | number | Date | null | undefined): string => {
  const date = resolveDate(value);
  if (!date) return "-";
  return `${formatDisplayDate(date)} ${formatDisplayTime(date)}`;
};

export const formatDateLabel = (date: Date) => {
  return formatDisplayDateTime(date);
};

const parseLegacyDateTime = (value: string) => {
  const [datePart, timePart] = value.split(" ");
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split("/").map(Number);
  const timeMatch = timePart.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?([ap]m)?$/i);
  if (!timeMatch) return null;
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  const meridiem = (timeMatch[4] || "").toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).getTime();
};

const parseDateWithTime = (value: string) => {
  // Format: "DD MMM YYYY HH:MM:SS", "DD MMM YYYY HH:MMam/pm" or "DD MMM YYYY"
  const parts = value.trim().split(" ");
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const year = parseInt(parts[2], 10);
  const monthIndex = MONTHS.indexOf(monthStr);

  if (isNaN(day) || monthIndex === -1 || isNaN(year)) return null;

  // Parse time if present (HH:MM[:SS][am/pm])
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length >= 4) {
    const timeMatch = parts[3].match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?([ap]m)?$/i);
    if (timeMatch) {
      hours = Number(timeMatch[1] || 0);
      minutes = Number(timeMatch[2] || 0);
      seconds = Number(timeMatch[3] || 0);
      const meridiem = (timeMatch[4] || "").toLowerCase();
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
    }
  }

  return new Date(year, monthIndex, day, hours, minutes, seconds).getTime();
};

export const parseDateValue = (value: string) => {
  if (!value) return 0;
  if (value.includes("/") && value.includes(":")) {
    const legacy = parseLegacyDateTime(value);
    return legacy ?? 0;
  }
  // Try parsing format "DD MMM YYYY HH:MM:SS" or "DD MMM YYYY"
  const dateWithTime = parseDateWithTime(value);
  if (dateWithTime) return dateWithTime;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatDateValue = (value: string) => {
  return formatDisplayDateTime(value);
};

export const formatTimeOnly = (value: string) => {
  return formatDisplayTime(value);
};

/**
 * Format decimal hours to HH:MMhrs format with proper minute rollover
 * Example: 18.786 -> "18:47hrs", 18.61 -> "19:01hrs" (if minutes exceed 60, roll over to hours)
 * This function handles minute rollover: if minutes >= 60, they roll over to hours
 *
 * @param decimalHours - Hours as a decimal number (e.g., 18.786)
 * @returns Formatted string in HH:MMhrs format
 */
export const formatHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) return "00:00hrs";

  // Convert to total minutes
  const totalMinutes = Math.round(decimalHours * 60);

  // Calculate hours and minutes with rollover
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${pad(hours)}:${pad(minutes)}hrs`;
};

/**
 * Format decimal hours to HH:MMhrs format with proper minute rollover
 * Example: 18.786 -> "18:47hrs", 18.61 -> "19:01hrs" (if minutes exceed 60, roll over to hours)
 *
 * @param decimalHours - Hours as a decimal number (e.g., 18.786)
 * @returns Formatted string in HH:MMhrs format
 */
export const formatDecimalHoursToHHMMhrs = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) return "00:00hrs";

  // Convert to total minutes
  const totalMinutes = Math.round(decimalHours * 60);

  // Calculate hours and minutes with rollover
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${pad(hours)}:${pad(minutes)}hrs`;
};
