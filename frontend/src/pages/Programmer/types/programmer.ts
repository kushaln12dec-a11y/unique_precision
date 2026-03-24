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
  sedmHoles: string;
  sedmEntriesJson?: string;
  operationRowsJson?: string;
  material: string;
  priority: "Low" | "Medium" | "High";
  description: string;
  remark?: string;
  programRefFile?: string;
  cutImage: string[];
  critical: boolean;
  pipFinish: boolean;
  refNumber?: string;
  manualTotalHrs?: string;
};

export type CalculationConfig = {
  settingHoursPerSetting?: number;
  complexExtraHours?: number;
  pipExtraHours?: number;
  customerConfigs?: Array<{
    customer: string;
    rate: string;
    settingHours?: string;
  }>;
  thicknessRateUpto100?: number;
  thicknessRateAbove100?: number;
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
