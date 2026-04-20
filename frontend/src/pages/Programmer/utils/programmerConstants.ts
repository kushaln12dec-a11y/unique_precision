import type { CutForm } from "../types/programmer";

export const SEDM_PRICING = [
  { key: "0.3-0.4", label: "0.3 - 0.4", min: 0.3, max: 0.4, min20: 60, perMm: 6 },
  { key: "0.5-0.6", label: "0.5 - 0.6", min: 0.5, max: 0.6, min20: 50, perMm: 4 },
  { key: "0.7", label: "0.7", min: 0.7, max: 0.7, min20: 40, perMm: 3 },
  { key: "0.8-1.2", label: "0.8 - 1.2", min: 0.8, max: 1.2, min20: 40, perMm: 2 },
  { key: "1.5-2.0", label: "1.5 - 2.0", min: 1.5, max: 2.0, min20: 50, perMm: 3 },
  { key: "2.2-2.5", label: "2.2 - 2.5", min: 2.2, max: 2.5, min20: 60, perMm: 4 },
  { key: "3.0", label: "3.0", min: 3.0, max: 3.0, min20: 80, perMm: 6 },
];

export const SEDM_PRICING_FIELD_MAP = {
  "0.3-0.4": { minField: "sedm034Min", perField: "sedm034PerMm" },
  "0.5-0.6": { minField: "sedm056Min", perField: "sedm056PerMm" },
  "0.7": { minField: "sedm07Min", perField: "sedm07PerMm" },
  "0.8-1.2": { minField: "sedm0812Min", perField: "sedm0812PerMm" },
  "1.5-2.0": { minField: "sedm1520Min", perField: "sedm1520PerMm" },
  "2.2-2.5": { minField: "sedm2225Min", perField: "sedm2225PerMm" },
  "3.0": { minField: "sedm30Min", perField: "sedm30PerMm" },
} as const;

export const PASS_MAP: Record<string, number> = {
  "1": 1,
  "2": 1.5,
  "3": 1.75,
  "4": 2.0,
  "5": 2.5,
  "6": 2.75,
};

export const PASS_PERCENT_MAP: Record<string, number> = {
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
  manualTotalHrs: "",
  sedmHoles: "1",
  sedmEntriesJson: "",
  operationRowsJson: "",
  material: "",
  priority: "Medium",
  description: "",
  remark: "",
  cutImage: [],
  critical: false,
  pipFinish: false,
};
