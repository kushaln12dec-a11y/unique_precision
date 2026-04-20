import { estimatedHoursFromAmount } from "../../utils/jobFormatting";
import type { CalculationConfig, CalculationResult, CutForm, WedmRowBreakdown } from "./types/programmer";
import { PASS_MAP, PASS_PERCENT_MAP, DEFAULT_CUT, SEDM_PRICING } from "./utils/programmerConstants";
import { sortGroupEntriesParentFirst } from "./utils/groupSort";
import { calculateSedmAmount, calculateSedmBreakdown, getElectrodeSize } from "./utils/sedmUtils";
import {
  getEffectiveThickness,
  getThicknessDisplayValue,
  normalizeThicknessInput,
  parseThicknessValue,
} from "./utils/thicknessUtils";

export type { CalculationConfig, CalculationResult, CutForm, SedmEntryBreakdown, WedmRowBreakdown } from "./types/programmer";
export {
  DEFAULT_CUT,
  SEDM_PRICING,
  calculateSedmAmount,
  getElectrodeSize,
  getEffectiveThickness,
  getThicknessDisplayValue,
  normalizeThicknessInput,
  sortGroupEntriesParentFirst,
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
  } catch {
    return [fallbackRow];
  }
};

const getSettingHours = (rawSetting: number, configuredSettingHours: number): number => {
  if (!Number.isFinite(rawSetting) || rawSetting <= 0) return 0;
  return configuredSettingHours;
};

export const calculateTotals = (form: CutForm, config: CalculationConfig = {}): CalculationResult => {
  const selectedCustomer = String(form.customer || "").trim().toUpperCase();
  const customerConfig = (config.customerConfigs || []).find(
    (item) => String(item.customer || "").trim().toUpperCase() === selectedCustomer
  );
  const customerRate = Number(form.rate) || 0;
  const operationRows = parseOperationRows(form);
  const configuredSettingHours =
    Number(customerConfig?.settingHours || "") > 0
      ? Number(customerConfig?.settingHours)
      : Number(config.settingHoursPerSetting) === 0.25
        ? 0.25
        : 0.5;
  const thicknessRateUpto100 = Number(config.thicknessRateUpto100) > 0 ? Number(config.thicknessRateUpto100) : 1500;
  const thicknessRateAbove100 = Number(config.thicknessRateAbove100) > 0 ? Number(config.thicknessRateAbove100) : 1200;

  const rows: WedmRowBreakdown[] = operationRows.map((row, index) => {
    const cutLength = Number(row.cut) || 0;
    const thicknessUsed = getEffectiveThickness(row.thickness);
    const divisor = thicknessUsed > 100 ? thicknessRateAbove100 : thicknessRateUpto100;
    const base = (cutLength * thicknessUsed) / divisor;
    const passMultiplier = PASS_MAP[row.passLevel] || 1;
    const passPercent = PASS_PERCENT_MAP[row.passLevel] ?? Math.max(0, (passMultiplier - 1) * 100);
    const cutAfterPass = base + (base * passPercent) / 100;
    const settingLevel = Number(row.setting) || 0;
    const qty = Number(row.qty) || 0;
    const settingHours = getSettingHours(settingLevel, configuredSettingHours);
    const qtyFirstSettingRuleApplied = settingLevel > 0 && qty > 0 && settingLevel !== qty;
    const passAfterMin = Math.max(1, cutAfterPass);
    const passPlusSettingRaw = qtyFirstSettingRuleApplied
      ? (passAfterMin * qty) + settingHours
      : cutAfterPass + settingHours;
    const passPlusSettingWithMin = qtyFirstSettingRuleApplied ? passPlusSettingRaw : Math.max(1, passPlusSettingRaw);
    const complexHours = Number(config.complexExtraHours ?? 1) || 1;
    const pipHours = Number(config.pipExtraHours ?? 1) || 1;
    const extraHoursPerUnit = (form.pipFinish ? pipHours : 0) + (form.critical ? complexHours : 0);

    const rowHours = qtyFirstSettingRuleApplied
      ? passPlusSettingWithMin + (extraHoursPerUnit * qty)
      : (passPlusSettingWithMin + extraHoursPerUnit) * qty;

    return {
      rowIndex: index + 1,
      cutLength,
      thicknessInput: String(row.thickness ?? ""),
      thicknessUsed,
      divisor,
      base,
      passLevel: row.passLevel,
      passMultiplier,
      passPercent,
      cutAfterPassRaw: cutAfterPass,
      cutAfterPass: cutAfterPass,
      passPlusSettingRaw,
      passPlusSettingWithMin,
      passAfterMin,
      minAppliedBeforeQty: qtyFirstSettingRuleApplied,
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
  const manualTotalHrsRaw = String(form.manualTotalHrs ?? "").trim();
  const manualTotalHrs = Number(manualTotalHrsRaw);
  const totalHrs =
    manualTotalHrsRaw !== "" && Number.isFinite(manualTotalHrs)
      ? Math.max(0, manualTotalHrs)
      : subtotalBeforeExtras;
  const wedmAmount = totalHrs * customerRate;
  const sedmEntries = calculateSedmBreakdown(form, customerConfig);
  const sedmAmount = sedmEntries.reduce((sum, entry) => sum + entry.entryCost, 0);
  const totalAmount = wedmAmount + sedmAmount;

  return {
    totalHrs,
    totalAmount,
    wedmAmount,
    sedmAmount,
    estimatedTime: estimatedHoursFromAmount(wedmAmount),
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
