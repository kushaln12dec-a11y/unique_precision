export const normalizeIndianPhone = (value: unknown): string => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const normalizedDigits = digits.startsWith("91") && digits.length > 10
    ? digits.slice(-10)
    : digits.slice(-10);

  return normalizedDigits ? `+91 ${normalizedDigits}` : "";
};

export const isValidIndianPhone = (value: unknown): boolean =>
  /^\+91\s\d{10}$/.test(String(value || "").trim());
