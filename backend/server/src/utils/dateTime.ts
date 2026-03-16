const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDbDateTime = (date = new Date()): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const formatDateForQuery = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const parseOperatorDateTime = (value?: string): Date | null => {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseDisplayDateTime = (value?: string): Date | null => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Try native parsing first (handles ISO strings)
  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native;

  // Try legacy DD/MM/YYYY HH:MM
  const legacy = parseOperatorDateTime(trimmed);
  if (legacy) return legacy;

  // Format: "DD MMM YYYY HH:MM" or "DD MMM YYYY HH:MMam/pm" or "DD MMM YYYY"
  const parts = trimmed.split(" ");
  if (parts.length < 3) return null;
  const dayToken = parts[0];
  const monthToken = parts[1];
  const yearToken = parts[2];
  if (!dayToken || !monthToken || !yearToken) return null;
  const day = Number(dayToken);
  const monthIndex = MONTHS.indexOf(monthToken);
  const year = Number(yearToken);
  if (!day || monthIndex === -1 || !year) return null;

  let hours = 0;
  let minutes = 0;
  if (parts.length >= 4) {
    const timeToken = parts[3];
    const timeMatch = timeToken ? timeToken.match(/^(\d{1,2}):(\d{2})(?:\:(\d{2}))?([ap]m)?$/i) : null;
    if (timeMatch) {
      const hourToken = timeMatch[1];
      const minuteToken = timeMatch[2];
      const meridiemToken = timeMatch[4];
      hours = Number(hourToken || 0);
      minutes = Number(minuteToken || 0);
      const meridiem = (meridiemToken || "").toLowerCase();
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
    }
  }

  const date = new Date(year, monthIndex, day, hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};
