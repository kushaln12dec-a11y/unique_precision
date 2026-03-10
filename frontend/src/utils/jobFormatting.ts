export const getInitials = (value: string): string => {
  const full = String(value || "").trim();
  if (!full) return "--";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return full.slice(0, 2).toUpperCase();
};

export const toYN = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Y" : "N";
  const text = String(value || "").trim().toLowerCase();
  if (text === "yes" || text === "y" || text === "true") return "Y";
  if (text === "no" || text === "n" || text === "false") return "N";
  return String(value || "-");
};

export const estimatedTimeFromAmount = (amount: number): string => {
  return ((Number(amount || 0) || 0) / 625).toFixed(2);
};

export const MACHINE_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;

export const toMachineIndex = (value: unknown): string => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  const normalized = raw.startsWith("M") ? raw.slice(1) : raw;
  return MACHINE_OPTIONS.includes(normalized as (typeof MACHINE_OPTIONS)[number]) ? normalized : "";
};

export const formatMachineLabel = (value: unknown): string => {
  const index = toMachineIndex(value);
  return index ? `M${index}` : "-";
};
