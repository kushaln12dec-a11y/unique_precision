export const normalizeIndianPhone = (value: unknown): string => {
  const raw = String(value || "");
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let digits = raw.replace(/\D/g, "");

  // When the user types into a field that already shows "+91 ",
  // don't treat that prefix as part of the local 10-digit number.
  if (trimmed.startsWith("+91")) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  const normalizedDigits = digits.slice(0, 10);
  return `+91 ${normalizedDigits}`.trimEnd();
};

export const isValidIndianPhone = (value: unknown): boolean =>
  /^\+91\s\d{10}$/.test(String(value || "").trim());
