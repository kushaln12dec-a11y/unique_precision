const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => value.toString().padStart(2, "0");

export const formatDateLabel = (date: Date) => {
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const parseLegacyDateTime = (value: string) => {
  const [datePart, timePart] = value.split(" ");
  if (!datePart || !timePart) return null;
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
};

export const parseDateValue = (value: string) => {
  if (!value) return 0;
  if (value.includes("/") && value.includes(":")) {
    const legacy = parseLegacyDateTime(value);
    return legacy ?? 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatDateValue = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "—";
  return formatDateLabel(new Date(parsed));
};
