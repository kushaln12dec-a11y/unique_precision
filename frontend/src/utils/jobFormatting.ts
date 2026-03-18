export const getEmailLocalPart = (value: unknown): string => {
  const email = String(value || "").trim();
  if (!email) return "";
  return email.split("@")[0]?.trim() || "";
};

export const getDisplayName = (
  firstName: unknown,
  lastName: unknown,
  email?: unknown,
  fallback = "User"
): string => {
  const fullName = `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
  if (fullName) return fullName;
  const emailLocalPart = getEmailLocalPart(email);
  return emailLocalPart || fallback;
};

export const getFirstNameDisplay = (
  firstName: unknown,
  email?: unknown,
  fallback = "User"
): string => {
  const normalizedFirstName = String(firstName || "").trim();
  if (normalizedFirstName) return normalizedFirstName;
  const emailLocalPart = getEmailLocalPart(email);
  return emailLocalPart || fallback;
};

export const getInitials = (value: string): string => {
  const full = String(value || "").trim();
  if (!full) return "--";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return full.slice(0, 2).toUpperCase();
};

export const getLogUserDisplayName = (
  userName: unknown,
  userEmail?: unknown,
  fallback = "Unknown User"
): string => {
  const directName = String(userName || "").trim();
  if (directName) return directName;
  const emailLocalPart = getEmailLocalPart(userEmail);
  return emailLocalPart || fallback;
};

export const toYN = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "Y" : "N";
  const text = String(value || "").trim().toLowerCase();
  if (text === "yes" || text === "y" || text === "true") return "Y";
  if (text === "no" || text === "n" || text === "false") return "N";
  return String(value || "-");
};

export const formatEstimatedTime = (hours: number): string => {
  const safeHours = Number(hours || 0) || 0;
  if (safeHours <= 0) return "0 mins";
  if (safeHours < 1) {
    const minutes = Math.max(1, Math.round(safeHours * 60));
    return `${minutes} mins`;
  }
  return `${safeHours.toFixed(2)} hrs`;
};

export const estimatedTimeFromAmount = (amount: number): string => {
  const hours = (Number(amount || 0) || 0) / 625 / 24;
  return formatEstimatedTime(hours);
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

export const formatJobRefDisplay = (value: unknown, withHash = true): string => {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (!raw) return "";
  const normalized = raw.replace(/^JOB-?/i, "JOB");
  return withHash ? `#${normalized}` : normalized;
};
