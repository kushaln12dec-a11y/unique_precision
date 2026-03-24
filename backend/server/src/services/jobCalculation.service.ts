type JobCalculationInput = {
  cut?: unknown;
  thickness?: unknown;
  passLevel?: unknown;
  qty?: unknown;
  rate?: unknown;
  totalHrs?: unknown;
  totalAmount?: unknown;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePassPercent = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  return 0;
};

export const calculateJob = (input: JobCalculationInput) => {
  const cut = toNumber(input.cut);
  const thickness = toNumber(input.thickness);
  const quantity = Math.max(1, Math.trunc(toNumber(input.qty) || 1));
  const rate = toNumber(input.rate);
  const passPercent = parsePassPercent(input.passLevel);
  const providedHours = toNumber(input.totalHrs);
  const providedAmount = toNumber(input.totalAmount);

  if (providedHours > 0 || providedAmount > 0) {
    return {
      totalHrs: providedHours,
      totalAmount: providedAmount,
    };
  }

  const baseHours = cut > 0 && thickness > 0 ? (cut * thickness) / 1500 : 0;
  const passAdjustedHours = Math.max(baseHours + (baseHours * passPercent) / 100, baseHours);
  const totalHrs = passAdjustedHours * quantity;
  const totalAmount = totalHrs * rate;

  return { totalHrs, totalAmount };
};
