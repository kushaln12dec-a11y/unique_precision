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
  operationRowsJson?: string; // JSON string storing additional operation rows
  material: string;
  priority: "Low" | "Medium" | "High";
  description: string;
  programRefFile?: string;
  cutImage: string[];
  critical: boolean;
  pipFinish: boolean;
  refNumber?: string;
};

export type CalculationConfig = {
  settingHoursPerSetting?: number;
  complexExtraHours?: number;
  pipExtraHours?: number;
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
  passLevel: "0",
  setting: "0",
  qty: "0",
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
  operationRowsJson: "",
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

type OperationRow = {
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
};

const parseOperationRows = (form: CutForm): OperationRow[] => {
  const fallbackRow: OperationRow = {
    cut: form.cut || "0",
    thickness: form.thickness || "0",
    passLevel: form.passLevel || "0",
    setting: form.setting || "0",
    qty: form.qty || "0",
  };

  if (!form.operationRowsJson || !form.operationRowsJson.trim()) {
    return [fallbackRow];
  }

  try {
    const parsed = JSON.parse(form.operationRowsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return [fallbackRow];
    const rows = parsed
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        cut: String((row as any).cut ?? (row as any).cutLength ?? "0"),
        thickness: String((row as any).thickness ?? (row as any).thk ?? "0"),
        passLevel: String((row as any).passLevel ?? (row as any).pass ?? "0"),
        setting: String((row as any).setting ?? (row as any).settingHrs ?? "0"),
        qty: String((row as any).qty ?? (row as any).quantity ?? "0"),
      }))
      .filter((row) => {
        const cutValue = Number(row.cut || 0);
        const thkValue = Number(row.thickness || 0);
        const passValue = Number(row.passLevel || 0);
        const settingValue = Number(row.setting || 0);
        const qtyValue = Number(row.qty || 0);
        return cutValue > 0 || thkValue > 0 || passValue > 0 || settingValue > 0 || qtyValue > 0;
      });
    return rows.length > 0 ? rows : [fallbackRow];
  } catch (error) {
    return [fallbackRow];
  }
};

const getSettingHours = (rawSetting: number): number => {
  if (!Number.isFinite(rawSetting) || rawSetting <= 0) return 0;
  // Business rule:
  // - Integer levels use mapped values: 1->0.5, 2->1, 3->2, 4->3, ...
  // - Decimal input (e.g. 1.25) is treated as direct hours.
  if (Number.isInteger(rawSetting)) {
    if (rawSetting === 1) return 0.5;
    if (rawSetting === 2) return 1;
    return rawSetting - 1;
  }
  return rawSetting;
};

export const calculateTotals = (form: CutForm, config: CalculationConfig = {}) => {
  const customerRate = Number(form.rate) || 0;
  const operationRows = parseOperationRows(form);
  
  const sedmAmount = calculateSedmAmount(form);
  const complexHours = Number(config.complexExtraHours ?? 1) || 1;
  const pipHours = Number(config.pipExtraHours ?? 1) || 1;
  const extraHours = (form.critical ? complexHours : 0) + (form.pipFinish ? pipHours : 0);
  const totalHrs = operationRows.reduce((sum, row) => {
    const cut = Number(row.cut) || 0;
    // Business rule: treat thickness below 20 mm as 20 mm for calculation only.
    const thickness = Math.max(20, Number(row.thickness) || 0);
    const passMultiplier = PASS_MAP[row.passLevel] || 1;
    const settingLevel = Number(row.setting) || 0;
    const qty = Number(row.qty) || 0;
    const thicknessDivisor = thickness > 100 ? 1200 : 1500;
    const cutHoursPerPiece = (cut * thickness) / thicknessDivisor * passMultiplier;
    const settingHours = getSettingHours(settingLevel);

    // Quantity scales only machining cut-hours; setup/extra are added once per row.
    return sum + (cutHoursPerPiece * qty) + settingHours + extraHours;
  }, 0);
  const wedmAmount = totalHrs * customerRate;
  const totalAmount = wedmAmount + sedmAmount;

  return {
    totalHrs,
    totalAmount,
    wedmAmount,
    sedmAmount,
  };
};
