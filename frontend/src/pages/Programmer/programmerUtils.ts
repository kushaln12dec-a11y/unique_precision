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
  sedmHoles: string; // Number of holes per piece
  priority: "Low" | "Medium" | "High";
  description: string;
  cutImage: string | null;
  critical: boolean;
  pipFinish: boolean;
  refNumber?: string;
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

// SEDM Rate Table: Based on Thickness and Electrode size
// Format: { thicknessRange: { electrode: rate } }
// Thickness ranges: "1-100", "101-150", "151-200"
// Electrode sizes match SEDM_PRICING ranges
export const SEDM_RATE_TABLE: Record<string, Record<string, number>> = {
  "1-100": {
    "0.3": 240,   // Example: TH 50/40, Electrode 0.3 → Rate 960 (per hole) / 4 holes = 240
    "0.4": 240,
    "0.5": 720,   // Example: TH 90, Electrode 0.5 → Rate 720
    "0.6": 720,
    "0.7": 720,
    "0.8": 720,   // Example: TH 90, Electrode 0.8 → Rate 720
    "1.2": 720,
    "1.5": 720,
    "2.0": 720,
    "2.2": 720,
    "2.5": 720,
    "3.0": 320,   // Example: TH 15→20, Electrode 3.0 → Rate 320
  },
  "101-150": {
    "0.3": 240,
    "0.4": 240,
    "0.5": 2880,  // Example: TH 120, Electrode 0.5 → Rate 2880
    "0.6": 2880,
    "0.7": 2880,
    "0.8": 2880,
    "1.2": 2880,
    "1.5": 2880,
    "2.0": 2880,
    "2.2": 2880,
    "2.5": 2880,
    "3.0": 320,
  },
  "151-200": {
    "0.3": 240,
    "0.4": 240,
    "0.5": 2880,
    "0.6": 2880,
    "0.7": 2880,
    "0.8": 2880,
    "1.2": 2880,
    "1.5": 2880,
    "2.0": 2880,
    "2.2": 2880,
    "2.5": 2880,
    "3.0": 320,
  },
};

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
  setting: "1",
  qty: "1",
  sedm: "No",
  sedmSelectionType: "range",
  sedmRangeKey: "0.3-0.4",
  sedmStandardValue: "",
  sedmLengthType: "min",
  sedmOver20Length: "",
  sedmLengthValue: "",
  refNumber: "",
  sedmHoles: "1", // Default to 1 hole per piece
  priority: "Medium",
  description: "",
  cutImage: null,
  critical: false,
  pipFinish: false,
};

// Get effective thickness (minimum 20 rule)
export const getEffectiveThickness = (thickness: number): number => {
  return thickness < 20 ? 20 : thickness;
};

// Get thickness range key for SEDM rate lookup
const getThicknessRange = (thickness: number): string => {
  const effectiveThk = getEffectiveThickness(thickness);
  if (effectiveThk <= 100) return "1-100";
  if (effectiveThk <= 150) return "101-150";
  return "151-200";
};

// Get electrode size from form (from sedmLengthValue or sedmRangeKey)
const getElectrodeSize = (form: CutForm): number | null => {
  if (form.sedmLengthValue?.trim()) {
    const numericValue = Number(form.sedmLengthValue);
    if (!Number.isNaN(numericValue)) return numericValue;
  }
  if (form.sedmSelectionType === "range" && form.sedmRangeKey) {
    // Extract min value from range key (e.g., "0.3-0.4" → 0.3)
    const match = form.sedmRangeKey.match(/^(\d+\.?\d*)/);
    if (match) return Number(match[1]);
  }
  if (form.sedmStandardValue) {
    const numericValue = Number(form.sedmStandardValue);
    if (!Number.isNaN(numericValue)) return numericValue;
  }
  return null;
};

// Find closest electrode size in SEDM rate table
const findClosestElectrode = (electrodeSize: number): string | null => {
  const electrodeKeys = ["0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "1.2", "1.5", "2.0", "2.2", "2.5", "3.0"];
  const electrodeNums = electrodeKeys.map(k => Number(k));
  
  // Find closest match
  let closest = electrodeKeys[0];
  let minDiff = Math.abs(electrodeSize - electrodeNums[0]);
  
  for (let i = 1; i < electrodeKeys.length; i++) {
    const diff = Math.abs(electrodeSize - electrodeNums[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = electrodeKeys[i];
    }
  }
  
  return closest;
};


// Calculate SEDM amount based on: Total holes × Rate
// Total holes = Qty × Holes per piece
// Rate comes from SEDM_RATE_TABLE based on thickness and electrode size
export const calculateSedmAmount = (form: CutForm) => {
  if (form.sedm !== "Yes") return 0;
  
  const thickness = Number(form.thickness) || 0;
  const effectiveThk = getEffectiveThickness(thickness);
  const thicknessRange = getThicknessRange(effectiveThk);
  const electrodeSize = getElectrodeSize(form);
  
  if (!electrodeSize) return 0;
  
  const electrodeKey = findClosestElectrode(electrodeSize);
  if (!electrodeKey) return 0;
  
  const rate = SEDM_RATE_TABLE[thicknessRange]?.[electrodeKey];
  if (!rate) return 0;
  
  const qty = Number(form.qty) || 0;
  const holesPerPiece = Number(form.sedmHoles) || 1;
  const totalHoles = qty * holesPerPiece;
  
  return totalHoles * rate;
};

// Get thickness-based divisor (rate) for WEDM calculation
const getThicknessDivisor = (thickness: number): number => {
  const effectiveThk = getEffectiveThickness(thickness);
  if (effectiveThk <= 100) return 1500;
  if (effectiveThk <= 150) return 1200;
  return 1000; // 151-200
};

export const calculateTotals = (form: CutForm) => {
  const customerRate = Number(form.rate) || 0;
  const cut = Number(form.cut) || 0;
  const thickness = Number(form.thickness) || 0;
  const effectiveThickness = getEffectiveThickness(thickness);
  const passMultiplier = PASS_MAP[form.passLevel] || 1;
  const settingLevel = Number(form.setting) || 0;
  const qty = Number(form.qty) || 0;
  
  // Calculate SEDM amount
  const sedmAmount = calculateSedmAmount(form);

  // Calculate WEDM (Wire EDM) hours
  // Use thickness-based divisor for hours calculation:
  // - Thickness 1-100 → divisor 1500
  // - Thickness 101-150 → divisor 1200
  // - Thickness 151-200 → divisor 1000
  const thicknessDivisor = getThicknessDivisor(thickness);
  const cutHoursPerPiece = (cut * effectiveThickness) / thicknessDivisor * passMultiplier;
  const settingHours = settingLevel * 0.5;
  const extraHours =
    (form.critical ? 1 : 0) + (form.pipFinish ? 1 : 0) + (form.sedm === "Yes" ? 1 : 0);
  const totalHrs = cutHoursPerPiece + settingHours + extraHours;
  
  // WEDM amount = Total Hrs × Rate × Qty
  // Using customer rate for WEDM cost calculation
  const wedmAmount = totalHrs * customerRate * qty;
  
  // Final Total = WEDM + SEDM
  const totalAmount = wedmAmount + sedmAmount;

  return {
    totalHrs,
    totalAmount,
    wedmAmount,
    sedmAmount,
  };
};
