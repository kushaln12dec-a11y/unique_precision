export const toBigInt = (value: unknown): bigint | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
};

export const requireBigInt = (value: unknown, fieldLabel = "value"): bigint => {
  const parsed = toBigInt(value);
  if (parsed === null) {
    throw new Error(`Invalid ${fieldLabel}`);
  }
  return parsed;
};
