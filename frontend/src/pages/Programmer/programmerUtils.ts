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
  sedmEntriesJson?: string; // JSON string storing multiple SEDM entries
  material: string;
  priority: "Low" | "Medium" | "High";
  description: string;
  programRefFile?: string;
  cutImage: string[];
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
  sedmEntriesJson: "",
  material: "",
  priority: "Medium",
  description: "",
  cutImage: [],
  critical: false,
  pipFinish: false,
};

export const getEffectiveThickness = (thickness: number): number => {
  return thickness < 20 ? 20 : thickness;
};

export const getElectrodeSize = (form: CutForm): number | null => {
  if (form.sedmLengthValue?.trim()) {
    const numericValue = Number(form.sedmLengthValue);
    if (!Number.isNaN(numericValue)) return numericValue;
  }
  if (form.sedmSelectionType === "range" && form.sedmRangeKey) {
    const match = form.sedmRangeKey.match(/^(\d+\.?\d*)/);
    if (match) return Number(match[1]);
  }
  if (form.sedmStandardValue) {
    const numericValue = Number(form.sedmStandardValue);
    if (!Number.isNaN(numericValue)) return numericValue;
  }
  return null;
};

const calculateSingleSedmEntry = (
  thickness: number,
  lengthValue: string,
  holes: number,
  qty: number
): number => {
  const electrodeSize = lengthValue ? Number(lengthValue) : null;
  if (!electrodeSize) return 0;
  
  const pricing = SEDM_PRICING.find(
    p => electrodeSize >= p.min && electrodeSize <= p.max
  );
  
  if (!pricing) return 0;
  
  const effectiveThk = getEffectiveThickness(thickness);
  
  let baseValue = pricing.min20;
  if (effectiveThk > 20) {
    baseValue += (effectiveThk - 20) * pricing.perMm;
  }
  
  return baseValue * holes * qty;
};

export const calculateSedmAmount = (form: CutForm) => {
  if (form.sedm !== "Yes") return 0;
  
  if (form.sedmEntriesJson && form.sedmEntriesJson.trim()) {
    try {
      const entries: Array<{ thickness: string; lengthValue: string; lengthType?: string; holes: string }> = 
        JSON.parse(form.sedmEntriesJson);
      const qty = Number(form.qty) || 1;
      
      return entries.reduce((sum, entry) => {
        const thickness = Number(entry.thickness) || 0;
        const holes = Number(entry.holes) || 1;
        return sum + calculateSingleSedmEntry(thickness, entry.lengthValue, holes, qty);
      }, 0);
    } catch (e) {
      console.warn("Failed to parse SEDM entries JSON:", e);
    }
  }
  
  const electrodeSize = getElectrodeSize(form);
  if (!electrodeSize) return 0;
  
  const pricing = SEDM_PRICING.find(
    p => electrodeSize >= p.min && electrodeSize <= p.max
  );
  
  if (!pricing) return 0;
  
  const thickness = Number(form.thickness) || 0;
  const effectiveThk = getEffectiveThickness(thickness);
  
  let baseValue = pricing.min20;
  if (effectiveThk > 20) {
    baseValue += (effectiveThk - 20) * pricing.perMm;
  }
  
  const holes = Number(form.sedmHoles) || 1;
  const qty = Number(form.qty) || 1;
  
  return baseValue * holes * qty;
};

const getThicknessDivisor = (thickness: number): number => {
  if (thickness < 20) {
    return 1017.44;
  }
  if (thickness <= 100) return 1465;
  if (thickness <= 150) return 1183;
  return 1000;
};

export const calculateTotals = (form: CutForm) => {
  const customerRate = Number(form.rate) || 0;
  const cut = Number(form.cut) || 0;
  const thickness = Number(form.thickness) || 0;
  const passMultiplier = PASS_MAP[form.passLevel] || 1;
  const settingLevel = Number(form.setting) || 0;
  const qty = Number(form.qty) || 0;
  
  const sedmAmount = calculateSedmAmount(form);
  const thicknessDivisor = getThicknessDivisor(thickness);
  const cutHoursPerPiece = (cut * thickness) / thicknessDivisor * passMultiplier;
  const settingHours = settingLevel * 0.5;
  const extraHours =
    (form.critical ? 1 : 0) + (form.pipFinish ? 1 : 0);
  const totalHrs = cutHoursPerPiece + settingHours + extraHours;
  const wedmAmount = totalHrs * customerRate * qty;
  const totalAmount = wedmAmount + sedmAmount;

  return {
    totalHrs,
    totalAmount,
    wedmAmount,
    sedmAmount,
  };
};
