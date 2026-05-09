type JobCalculationInput = {
  cut?: unknown;
  thickness?: unknown;
  passLevel?: unknown;
  qty?: unknown;
  rate?: unknown;
  setting?: unknown;
  totalHrs?: unknown;
  totalAmount?: unknown;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateJob = (input: JobCalculationInput) => {
  const cut = toNumber(input.cut);
  const thickness = toNumber(input.thickness);
  const quantity = Math.max(1, Math.trunc(toNumber(input.qty) || 1));
  const rate = toNumber(input.rate);
  const settingLevel = toNumber(input.setting);
  
  const providedHours = toNumber(input.totalHrs);
  const providedAmount = toNumber(input.totalAmount);

  // If frontend already provided calculated values, trust them
  if (providedHours > 0 || providedAmount > 0) {
    return {
      totalHrs: providedHours,
      totalAmount: providedAmount,
      wedmAmount: providedAmount,
      sedmAmount: 0,
    };
  }

  // Divisor logic matching frontend
  const divisor = thickness > 100 ? 1200 : 1500;
  const baseHrs = (cut * thickness) / divisor;

  // Pass multipliers matching frontend PASS_MAP logic
  const passMultipliers: Record<string, number> = {
    "1": 1.0,
    "2": 1.15,
    "3": 1.25,
    "4": 1.35,
    "5": 1.45,
  };
  const multiplier = passMultipliers[String(input.passLevel)] || 1.0;
  const cutAfterPass = baseHrs * multiplier;

  // Setting hours matching frontend configuredSettingHours logic
  const settingHrs = settingLevel > 0 ? 0.5 : 0;

  // Rule: min 1 hr per unit for (cutAfterPass + settingHrs)
  const totalHrsPerUnit = Math.max(1, cutAfterPass + settingHrs);
  const totalHrs = totalHrsPerUnit * quantity;
  const totalAmount = totalHrs * rate;

  return { 
    totalHrs, 
    totalAmount,
    wedmAmount: totalAmount,
    sedmAmount: 0
  };
};
