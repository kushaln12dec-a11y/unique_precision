const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => value.toString().padStart(2, "0");

export const formatDateLabel = (date: Date) => {
  const day = pad(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
};

const parseLegacyDateTime = (value: string) => {
  const [datePart, timePart] = value.split(" ");
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
};

const parseDateWithTime = (value: string) => {
  // Format: "DD MMM YYYY HH:MM:SS" or "DD MMM YYYY"
  const parts = value.trim().split(" ");
  if (parts.length < 3) return null;
  
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const year = parseInt(parts[2], 10);
  const monthIndex = MONTHS.indexOf(monthStr);
  
  if (isNaN(day) || monthIndex === -1 || isNaN(year)) return null;
  
  // Parse time if present (HH:MM:SS)
  let hours = 0, minutes = 0, seconds = 0;
  if (parts.length >= 4 && parts[3].includes(":")) {
    const timeParts = parts[3].split(":").map(Number);
    hours = timeParts[0] || 0;
    minutes = timeParts[1] || 0;
    seconds = timeParts[2] || 0;
  }
  
  return new Date(year, monthIndex, day, hours, minutes, seconds).getTime();
};

export const parseDateValue = (value: string) => {
  if (!value) return 0;
  if (value.includes("/") && value.includes(":")) {
    const legacy = parseLegacyDateTime(value);
    return legacy ?? 0;
  }
  // Try parsing new format "DD MMM YYYY HH:MM:SS" or "DD MMM YYYY"
  const dateWithTime = parseDateWithTime(value);
  if (dateWithTime) return dateWithTime;
  
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatDateValue = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "—";
  const date = new Date(parsed);
  const day = pad(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const formatTimeOnly = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "—";
  const date = new Date(parsed);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
};

export const formatHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) return "00.00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${pad(hours)}.${pad(minutes)}`;
};
