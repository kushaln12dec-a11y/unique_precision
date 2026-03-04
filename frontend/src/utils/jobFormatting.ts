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
