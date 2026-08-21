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
  if (fullName) return fullName.toUpperCase();
  const emailLocalPart = getEmailLocalPart(email);
  return String(emailLocalPart || fallback).toUpperCase();
};

export const getFirstNameDisplay = (
  firstName: unknown,
  email?: unknown,
  fallback = "User"
): string => {
  const normalizedFirstName = String(firstName || "").trim();
  if (normalizedFirstName) return normalizedFirstName.toUpperCase();
  const emailLocalPart = getEmailLocalPart(email);
  return String(emailLocalPart || fallback).toUpperCase();
};

export const getPrimaryPersonName = (
  value: unknown,
  fallback = "User"
): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback.toUpperCase();
  const firstToken = normalized.split(/[\s,]+/).find(Boolean);
  return String(firstToken || fallback).toUpperCase();
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
  if (directName) return directName.toUpperCase();
  const emailLocalPart = getEmailLocalPart(userEmail);
  return String(emailLocalPart || fallback).toUpperCase();
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

export const estimatedHoursFromAmount = (amount: number): number => {
  return (Number(amount || 0) || 0) / 625;
};

export const estimatedDurationSecondsFromHours = (hours: number): number => {
  const safeHours = Number(hours || 0) || 0;
  if (safeHours <= 0) return 0;
  if (safeHours < 1) {
    const minutes = Math.max(1, Math.round(safeHours * 60));
    return minutes * 60;
  }
  return Math.max(0, Math.round(Number(safeHours.toFixed(2)) * 3600));
};

export const estimatedTimeFromAmount = (amount: number): string => {
  return formatEstimatedTime(estimatedHoursFromAmount(amount));
};

export const MACHINE_OPTIONS = ["1", "2", "3", "4", "5", "6"] as const;

export const toMachineIndex = (value: unknown): string => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  const normalized = raw.startsWith("M") ? raw.slice(1) : raw;
  if (!/^\d+$/.test(normalized)) return "";
  const numberValue = Number(normalized);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return "";
  return String(numberValue);
};

export const formatMachineLabel = (value: unknown): string => {
  const index = toMachineIndex(value);
  return index ? `M${index}` : "-";
};

export const formatJobRefDisplay = (value: unknown, withHash = true): string => {
  const raw = String(value || "")
    .trim()
    .replace(/^#/, "")
    .replace(/^Job\s*#?\s*/i, "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  const directMatch = compact.match(/^JOB-?(\d+)$/i);
  if (directMatch) {
    const normalized = `JOB${directMatch[1].padStart(5, "0")}`;
    return withHash ? `#${normalized}` : normalized;
  }

  const numericMatch = compact.match(/^-?(\d+)$/);
  if (numericMatch) {
    const normalized = `JOB${numericMatch[1].padStart(5, "0")}`;
    return withHash ? `#${normalized}` : normalized;
  }

  const normalized = compact.replace(/^JOB-?/i, "JOB");
  return withHash ? `#${normalized}` : normalized;
};

export const getQuantityIdentifier = (quantityIndexOrNumber: unknown): string => {
  const numeric = Number(quantityIndexOrNumber);
  if (!Number.isFinite(numeric)) return "";
  const normalized = Math.trunc(numeric);
  return normalized > 0 ? String(normalized) : "";
};

export const getQuantityIdentifierFromIndex = (quantityIndex: unknown): string => {
  const numeric = Number(quantityIndex);
  if (!Number.isFinite(numeric)) return "";
  return getQuantityIdentifier(Math.trunc(numeric) + 1);
};

export const formatQuantityIdentifier = (quantityIndexOrNumber: unknown, prefix = "Qty"): string => {
  const identifier = getQuantityIdentifier(quantityIndexOrNumber);
  const separator = prefix === "Q" ? "" : " ";
  return identifier ? `${prefix}${separator}${identifier}` : `${prefix} -`;
};

export const formatQuantityIdentifierFromIndex = (quantityIndex: unknown, prefix = "Qty"): string => {
  const identifier = getQuantityIdentifierFromIndex(quantityIndex);
  return identifier ? `${prefix} ${identifier}` : `${prefix} -`;
};

export const formatQuantityRangeIdentifier = (
  fromQuantityNumber: unknown,
  toQuantityNumber: unknown,
  prefix = "Qty"
): string => {
  const from = getQuantityIdentifier(fromQuantityNumber);
  const to = getQuantityIdentifier(toQuantityNumber);
  if (!from && !to) return `${prefix} -`;
  if (!to || from === to) return `${prefix} ${from || to}`;
  return `${prefix} ${from}-${to}`;
};

export const getSettingIdentifier = (job: { settingIdentifier?: unknown; settingNumber?: unknown; setting?: unknown } | null | undefined, fallbackIndex?: number): string => {
  const explicit = String(job?.settingIdentifier || "").trim();
  if (explicit) return explicit;
  const numericSettingNumber = Number(job?.settingNumber);
  if (Number.isFinite(numericSettingNumber) && numericSettingNumber > 0) return String(Math.trunc(numericSettingNumber));
  const numericFallback = Number(fallbackIndex);
  if (Number.isFinite(numericFallback) && numericFallback >= 0) return String(Math.trunc(numericFallback) + 1);
  const setting = String(job?.setting || "").trim();
  return setting || "";
};

export const formatSettingIdentifier = (
  job: { settingIdentifier?: unknown; settingNumber?: unknown; setting?: unknown } | null | undefined,
  fallbackIndex?: number,
  prefix = "Setting"
): string => {
  const identifier = getSettingIdentifier(job, fallbackIndex);
  return identifier ? `${prefix} ${identifier}` : `${prefix} -`;
};

export const withJobIdentifiers = <T extends { id?: unknown; groupId?: unknown; qty?: unknown; settingIdentifier?: string; settingNumber?: number }>(
  jobs: T[]
): Array<T & { settingNumber: number; settingIdentifier: string; quantityIdentifiers: string[] }> => {
  const groups = new Map<string, T[]>();
  const groupOrder: string[] = [];

  jobs.forEach((job) => {
    const groupKey = String(job.groupId ?? job.id ?? "");
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
      groupOrder.push(groupKey);
    }
    groups.get(groupKey)!.push(job);
  });

  return groupOrder.flatMap((groupKey) => {
    const groupJobs = [...(groups.get(groupKey) || [])].sort((left: any, right: any) => {
      const leftTime = new Date(String(left?.createdAt || "")).getTime();
      const rightTime = new Date(String(right?.createdAt || "")).getTime();
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    });

    return groupJobs.map((job, index) => {
      const nextSettingNumber = index + 1;
      const totalQty = Math.max(0, Math.trunc(Number(job.qty || 0)));

      return {
        ...job,
        settingNumber: nextSettingNumber,
        settingIdentifier: String(nextSettingNumber),
        quantityIdentifiers: Array.from({ length: totalQty }, (_, index) => String(index + 1)),
      };
    });
  });
};
