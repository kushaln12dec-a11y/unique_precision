const EMPLOYEE_ID_PREFIX = "EMP";
const EMPLOYEE_ID_PAD_LENGTH = 4;
const EMPLOYEE_ID_WITH_PREFIX_REGEX = /^EMP0*(\d+)$/i;
const DIGITS_ONLY_REGEX = /^\d+$/;

export const getEmployeeIdSequence = (value: unknown): number => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return 0;

  const prefixedMatch = trimmed.toUpperCase().match(EMPLOYEE_ID_WITH_PREFIX_REGEX);
  if (prefixedMatch) {
    const parsed = Number(prefixedMatch[1]);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }

  if (DIGITS_ONLY_REGEX.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }

  return 0;
};

export const formatEmployeeId = (value: unknown): string => {
  const sequence = getEmployeeIdSequence(value);
  if (sequence > 0) {
    return `${EMPLOYEE_ID_PREFIX}${String(sequence).padStart(EMPLOYEE_ID_PAD_LENGTH, "0")}`;
  }

  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.toUpperCase();
};
