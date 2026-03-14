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

export type WedmRowBreakdown = {
  rowIndex: number;
  cutLength: number;
  thicknessInput: string;
  thicknessUsed: number;
  divisor: number;
  base: number;
  passLevel: string;
  passMultiplier: number;
  passPercent: number;
  cutAfterPassRaw: number;
  cutAfterPass: number;
  passPlusSettingRaw: number;
  passPlusSettingWithMin: number;
  passAfterMin: number;
  minAppliedBeforeQty: boolean;
  settingInput: number;
  settingHours: number;
  extraHoursPerUnit: number;
  qty: number;
  qtyFirstSettingRuleApplied: boolean;
  rowHours: number;
};

export type SedmEntryBreakdown = {
  entryIndex: number;
  thicknessInput: string;
  thicknessUsed: number;
  electrodeSize: number;
  min20: number;
  perMm: number;
  baseCost: number;
  holes: number;
  qty: number;
  entryCost: number;
};

export type CalculationResult = {
  totalHrs: number;
  totalAmount: number;
  wedmAmount: number;
  sedmAmount: number;
  estimatedTime: number;
  wedmBreakdown: {
    rows: WedmRowBreakdown[];
    subtotalBeforeExtras: number;
    extraHours: number;
    finalHours: number;
    rate: number;
  };
  sedmBreakdown: {
    entries: SedmEntryBreakdown[];
  };
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

const PASS_PERCENT_MAP: Record<string, number> = {
  "1": 0,
  "2": 50,
  "3": 75,
  "4": 100,
  "5": 150,
  "6": 175,
};

export const DEFAULT_CUT: CutForm = {
  customer: "UPC",
  rate: "",
  cut: "",
  thickness: "",
  passLevel: "",
  setting: "",
  qty: "",
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

export const getThicknessDisplayValue = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  return raw || "-";
};

export const normalizeThicknessInput = (rawValue: string, previousValue = ""): string => {
  const cleaned = String(rawValue || "")
    .replace(/[^\d./\s]/g, "")
    .replace(/\s+/g, " ");

  const trimmed = cleaned.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return previousValue;

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) {
    return trimmed;
  }

  const left = trimmed.slice(0, slashIndex).trim();
  const right = trimmed.slice(slashIndex + 1).replace(/\//g, "").trim();
  if (!left) return previousValue;
  return right ? `${left} / ${right}` : `${left} /`;
};

const parseThicknessValue = (value: unknown): number => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (raw.includes("/")) {
    const [leftRaw = "", rightRaw = ""] = raw.split("/", 2);
    const leftToken = leftRaw.trim();
    const rightToken = rightRaw.trim();
    const left = Number(leftToken);
    const right = Number(rightToken);
    const hasLeft = leftToken !== "" && Number.isFinite(left);
    const hasRight = rightToken !== "" && Number.isFinite(right);
    if (hasLeft && hasRight) return (left + right) / 2;
    if (hasLeft && !hasRight) return left;
    return 0;
  }
  const direct = Number(raw);
  return Number.isFinite(direct) ? direct : 0;
};

const parseSedmThicknessValues = (value: unknown): number[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  if (raw.includes("/")) {
    const [leftRaw = "", rightRaw = ""] = raw.split("/", 2);
    const leftToken = leftRaw.trim();
    const rightToken = rightRaw.trim();
    const left = Number(leftToken);
    const right = Number(rightToken);
    const hasLeft = leftToken !== "" && Number.isFinite(left);
    const hasRight = rightToken !== "" && Number.isFinite(right);
    if (hasLeft && hasRight) return [left, right];
    if (hasLeft && !hasRight) return [left];
    return [];
  }
  const direct = Number(raw);
  return Number.isFinite(direct) ? [direct] : [];
};

export const getEffectiveThickness = (thickness: unknown): number => {
  return Math.max(20, parseThicknessValue(thickness));
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
  thicknessInput: unknown,
  lengthValue: string,
  holes: number,
  qty: number,
  entryIndex: number
): SedmEntryBreakdown[] => {
  const electrodeSize = lengthValue ? Number(lengthValue) : null;
  if (!electrodeSize) return [];
  
  const pricing = SEDM_PRICING.find(
    p => electrodeSize >= p.min && electrodeSize <= p.max
  );
  
  if (!pricing) return [];

  const thicknessValues = parseSedmThicknessValues(thicknessInput);
  if (thicknessValues.length === 0) return [];

  return thicknessValues.map((thickness, idx) => {
    const effectiveThickness = Math.max(thickness, 20);
    // Excel rule:
    // - thickness <= 20 => Min20
    // - thickness > 20  => thickness * PerMM
    const baseCost = thickness > 20 ? thickness * pricing.perMm : pricing.min20;
    const entryCost = baseCost * holes * qty;

    return {
      entryIndex: entryIndex + idx,
      thicknessInput: String(thickness),
      thicknessUsed: effectiveThickness,
      electrodeSize,
      min20: pricing.min20,
      perMm: pricing.perMm,
      baseCost,
      holes,
      qty,
      entryCost,
    };
  });
};

const calculateSedmBreakdown = (form: CutForm): SedmEntryBreakdown[] => {
  if (form.sedm !== "Yes") return [];
  
  if (form.sedmEntriesJson && form.sedmEntriesJson.trim()) {
    try {
      const entries: Array<{ thickness: string; lengthValue: string; lengthType?: string; holes: string }> =
        JSON.parse(form.sedmEntriesJson);
      const qty = Number(form.qty) || 1;
      let serial = 1;
      const expanded: SedmEntryBreakdown[] = [];
      entries.forEach((entry) => {
        const holes = Number(entry.holes) || 1;
        const list = calculateSingleSedmEntry(entry.thickness, entry.lengthValue, holes, qty, serial);
        expanded.push(...list);
        serial += list.length || 1;
      });
      return expanded;
    } catch (e) {
      console.warn("Failed to parse SEDM entries JSON:", e);
    }
  }
  
  const electrodeSize = getElectrodeSize(form);
  if (!electrodeSize) return [];
  
  const pricing = SEDM_PRICING.find(
    p => electrodeSize >= p.min && electrodeSize <= p.max
  );
  
  if (!pricing) return [];
  
  const holes = Number(form.sedmHoles) || 1;
  const qty = Number(form.qty) || 1;
  return calculateSingleSedmEntry(form.thickness, String(electrodeSize), holes, qty, 1);
};

export const calculateSedmAmount = (form: CutForm) => {
  return calculateSedmBreakdown(form).reduce((sum, entry) => sum + entry.entryCost, 0);
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
    passLevel: form.passLevel || "",
    setting: form.setting || "",
    qty: form.qty || "",
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
        passLevel: String((row as any).passLevel ?? (row as any).pass ?? ""),
        setting: String((row as any).setting ?? (row as any).settingHrs ?? ""),
        qty: String((row as any).qty ?? (row as any).quantity ?? ""),
      }))
      .filter((row) => {
        const cutValue = Number(row.cut || 0);
        const thkValue = parseThicknessValue(row.thickness);
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

const getSettingHours = (rawSetting: number, configuredSettingHours: number): number => {
  if (!Number.isFinite(rawSetting) || rawSetting <= 0) return 0;
  return configuredSettingHours;
};

export const calculateTotals = (form: CutForm, config: CalculationConfig = {}): CalculationResult => {
  const customerRate = Number(form.rate) || 0;
  const operationRows = parseOperationRows(form);
  const configuredSettingHours = Number(config.settingHoursPerSetting) === 0.25 ? 0.25 : 0.5;

  const rows: WedmRowBreakdown[] = operationRows.map((row, index) => {
    const cutLength = Number(row.cut) || 0;
    const thicknessInput = String(row.thickness ?? "");
    const thicknessUsed = parseThicknessValue(row.thickness);
    const divisor = thicknessUsed > 100 ? 1200 : 1500;
    const base = (cutLength * thicknessUsed) / divisor;
    const passMultiplier = PASS_MAP[row.passLevel] || 1;
    const passPercent = PASS_PERCENT_MAP[row.passLevel] ?? Math.max(0, (passMultiplier - 1) * 100);
    const cutAfterPassRaw = base + (base * passPercent) / 100;
    const cutAfterPass = cutAfterPassRaw;
    const settingLevel = Number(row.setting) || 0;
    const qty = Number(row.qty) || 0;
    const settingHours = getSettingHours(settingLevel, configuredSettingHours);
    const qtyFirstSettingRuleApplied = settingLevel > 0 && qty > 0 && settingLevel !== qty;
    const passAfterMin = Math.max(1, cutAfterPass);
    const minAppliedBeforeQty = qtyFirstSettingRuleApplied;
    const passPlusSettingRaw = qtyFirstSettingRuleApplied
      ? (passAfterMin * qty) + settingHours
      : cutAfterPass + settingHours;
    const passPlusSettingWithMin = qtyFirstSettingRuleApplied
      ? passPlusSettingRaw
      : Math.max(1, passPlusSettingRaw);
    const complexHours = Number(config.complexExtraHours ?? 1) || 1;
    const pipHours = Number(config.pipExtraHours ?? 1) || 1;
    const extraHoursPerUnit = (form.pipFinish ? pipHours : 0) + (form.critical ? complexHours : 0);

    const rowHours = qtyFirstSettingRuleApplied
      ? passPlusSettingWithMin + (extraHoursPerUnit * qty)
      : (passPlusSettingWithMin + extraHoursPerUnit) * qty;

    return {
      rowIndex: index + 1,
      cutLength,
      thicknessInput,
      thicknessUsed,
      divisor,
      base,
      passLevel: row.passLevel,
      passMultiplier,
      passPercent,
      cutAfterPassRaw,
      cutAfterPass,
      passPlusSettingRaw,
      passPlusSettingWithMin,
      passAfterMin,
      minAppliedBeforeQty,
      settingInput: settingLevel,
      settingHours,
      extraHoursPerUnit,
      qty,
      qtyFirstSettingRuleApplied,
      rowHours,
    };
  });

  const subtotalBeforeExtras = rows.reduce((sum, row) => sum + row.rowHours, 0);
  const extraHours = rows.reduce((sum, row) => sum + (row.extraHoursPerUnit * row.qty), 0);
  const totalHrs = subtotalBeforeExtras;
  const wedmAmount = totalHrs * customerRate;
  const sedmEntries = calculateSedmBreakdown(form);
  const sedmAmount = sedmEntries.reduce((sum, entry) => sum + entry.entryCost, 0);
  const totalAmount = wedmAmount + sedmAmount;
  const estimatedTime = wedmAmount / 625;

  return {
    totalHrs,
    totalAmount,
    wedmAmount,
    sedmAmount,
    estimatedTime,
    wedmBreakdown: {
      rows,
      subtotalBeforeExtras,
      extraHours,
      finalHours: totalHrs,
      rate: customerRate,
    },
    sedmBreakdown: {
      entries: sedmEntries,
    },
  };
};
