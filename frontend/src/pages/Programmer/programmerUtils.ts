export type CutForm = {
  customer: string;
  rate: string;
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
  sedm: "Yes" | "No";
  sedmSelectionType: "range" | "standard";
  sedmRangeKey: string;
  sedmStandardValue: string;
  sedmLengthType: "min" | "per";
  sedmOver20Length: string;
  sedmLengthValue: string;
  priority: "Low" | "Medium" | "High";
  description: string;
  cutImage: string | null;
  critical: boolean;
  pipFinish: boolean;
};

export const SEDM_PRICING = [
  { key: "0.3-0.4", label: "0.3 - 0.4", min: 0.3, max: 0.4, min20: 60, perMm: 6 },
  { key: "0.5-0.6", label: "0.5 - 0.6", min: 0.5, max: 0.6, min20: 50, perMm: 4 },
  { key: "0.7", label: "0.7", min: 0.7, max: 0.7, min20: 40, perMm: 3 },
  { key: "0.8-1.2", label: "0.8 - 1.2", min: 0.8, max: 1.2, min20: 40, perMm: 2 },
  { key: "1.5-2.0", label: "1.5 - 2.0", min: 1.5, max: 2.0, min20: 50, perMm: 3 },
  { key: "2.2-2.5", label: "2.2 - 2.5", min: 2.2, max: 2.5, min20: 60, perMm: 4 },
  { key: "3.0", label: "3.0", min: 3.0, max: 3.0, min20: 80, perMm: 6 },
];

const PASS_MAP: Record<string, number> = {
  "1": 1,
  "2": 1.5,
  "3": 1.75,
  "4": 2.0,
  "5": 2.5,
  "6": 2.75,
};

export const DEFAULT_CUT: CutForm = {
  customer: "",
  rate: "",
  cut: "",
  thickness: "",
  passLevel: "1",
  setting: "0",
  qty: "1",
  sedm: "No",
  sedmSelectionType: "range",
  sedmRangeKey: "0.3-0.4",
  sedmStandardValue: "",
  sedmLengthType: "min",
  sedmOver20Length: "",
  sedmLengthValue: "",
  priority: "Medium",
  description: "",
  cutImage: null,
  critical: false,
  pipFinish: false,
};

const resolveSedmPricing = (form: CutForm) => {
  if (form.sedm !== "Yes") return null;
  const rawValue = form.sedmLengthValue?.trim();
  if (rawValue) {
    const numericValue = Number(rawValue);
    if (!Number.isNaN(numericValue)) {
      return (
        SEDM_PRICING.find(
          (item) => numericValue >= item.min && numericValue <= item.max
        ) || null
      );
    }
  }
  if (form.sedmSelectionType === "range") {
    return SEDM_PRICING.find((item) => item.key === form.sedmRangeKey) || null;
  }
  const standardValue = Number(form.sedmStandardValue);
  if (!standardValue) return null;
  return (
    SEDM_PRICING.find((item) => standardValue >= item.min && standardValue <= item.max) ||
    null
  );
};

export const calculateSedmAmount = (form: CutForm) => {
  if (form.sedm !== "Yes") return 0;
  const pricing = resolveSedmPricing(form);
  if (!pricing) return 0;
  const qty = Number(form.qty) || 0;
  if (form.sedmLengthType === "min") {
    return pricing.min20 * qty;
  }
  return pricing.min20 * pricing.perMm * qty;
};

export const calculateTotals = (form: CutForm) => {
  const rate = Number(form.rate) || 0;
  const cut = Number(form.cut) || 0;
  const thickness = Number(form.thickness) || 0;
  const passMultiplier = PASS_MAP[form.passLevel] || 1;
  const settingLevel = Number(form.setting) || 0;
  const qty = Number(form.qty) || 0;
  const sedmAmount = calculateSedmAmount(form);

  const divisor = thickness > 100 ? 1200 : 1500;
  const cutHoursPerPiece = (cut * thickness) / divisor * passMultiplier;
  const settingHours = settingLevel * 0.5;
  const extraHours =
    (form.critical ? 1 : 0) + (form.pipFinish ? 1 : 0) + (form.sedm === "Yes" ? 1 : 0);
  const totalHrs = cutHoursPerPiece + settingHours + extraHours;
  const totalAmount = totalHrs * rate * qty + sedmAmount;

  return {
    totalHrs,
    totalAmount,
  };
};
