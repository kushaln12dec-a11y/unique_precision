const EMP_ID_PREFIX = "EMP";
const EMP_ID_PAD_LENGTH = 4;
const EMP_ID_WITH_PREFIX_REGEX = /^EMP0*(\d+)$/i;
const DIGITS_ONLY_REGEX = /^\d+$/;

export const getEmpIdSequence = (value: unknown): number => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return 0;

  const prefixed = trimmed.toUpperCase().match(EMP_ID_WITH_PREFIX_REGEX);
  if (prefixed) {
    const parsed = Number(prefixed[1]);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }

  if (DIGITS_ONLY_REGEX.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }

  return 0;
};

export const formatEmpId = (sequence: number): string => {
  const safeSequence = Math.max(1, Math.trunc(sequence));
  return `${EMP_ID_PREFIX}${String(safeSequence).padStart(EMP_ID_PAD_LENGTH, "0")}`;
};

export const normalizeEmpId = (value: unknown): string => {
  const sequence = getEmpIdSequence(value);
  if (sequence > 0) return formatEmpId(sequence);

  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.toUpperCase();
};

export const getEmpIdCandidates = (identifier: unknown): string[] => {
  const trimmed = String(identifier ?? "").trim();
  if (!trimmed) return [];

  const normalized = normalizeEmpId(trimmed);
  const sequence = getEmpIdSequence(trimmed);
  const candidates = new Set<string>([trimmed.toUpperCase()]);
  if (normalized) candidates.add(normalized);
  if (sequence > 0) {
    candidates.add(`${EMP_ID_PREFIX}${sequence}`);
    candidates.add(`${EMP_ID_PREFIX}${String(sequence).padStart(3, "0")}`);
  }
  return Array.from(candidates);
};
