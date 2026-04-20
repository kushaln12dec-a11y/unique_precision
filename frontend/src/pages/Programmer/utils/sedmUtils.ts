import type { CutForm, SedmEntryBreakdown } from "../types/programmer";
import { SEDM_PRICING, SEDM_PRICING_FIELD_MAP } from "./programmerConstants";
import { getEffectiveThickness, parseSedmThicknessValues } from "./thicknessUtils";

type SedmJsonEntry = {
  thickness: string;
  lengthValue: string;
  lengthType?: string;
  holes: string;
};

type SedmCustomerConfig = {
  [key: string]: string | undefined;
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
  entryIndex: number,
  customerConfig?: SedmCustomerConfig
): SedmEntryBreakdown[] => {
  const electrodeSize = lengthValue ? Number(lengthValue) : null;
  if (!electrodeSize) return [];

  const pricingBase = SEDM_PRICING.find((item) => electrodeSize >= item.min && electrodeSize <= item.max);
  if (!pricingBase) return [];

  const fieldMap = SEDM_PRICING_FIELD_MAP[pricingBase.key as keyof typeof SEDM_PRICING_FIELD_MAP];
  const pricing = {
    ...pricingBase,
    min20: Number(customerConfig?.[fieldMap.minField]) || pricingBase.min20,
    perMm: Number(customerConfig?.[fieldMap.perField]) || pricingBase.perMm,
  };

  const thicknessValues = parseSedmThicknessValues(thicknessInput);
  if (thicknessValues.length === 0) return [];

  return thicknessValues.map((thickness, idx) => {
    const effectiveThickness = getEffectiveThickness(thickness);
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

export const calculateSedmBreakdown = (form: CutForm, customerConfig?: SedmCustomerConfig): SedmEntryBreakdown[] => {
  if (form.sedm !== "Yes") return [];

  if (form.sedmEntriesJson && form.sedmEntriesJson.trim()) {
    try {
      const entries: SedmJsonEntry[] = JSON.parse(form.sedmEntriesJson);
      const qty = Number(form.qty) || 1;
      let serial = 1;
      const expanded: SedmEntryBreakdown[] = [];

      entries.forEach((entry) => {
        const holes = Number(entry.holes) || 1;
        const list = calculateSingleSedmEntry(entry.thickness, entry.lengthValue, holes, qty, serial, customerConfig);
        expanded.push(...list);
        serial += list.length || 1;
      });

      return expanded;
    } catch (error) {
      console.warn("Failed to parse SEDM entries JSON:", error);
    }
  }

  const electrodeSize = getElectrodeSize(form);
  if (!electrodeSize) return [];

  const holes = Number(form.sedmHoles) || 1;
  const qty = Number(form.qty) || 1;
  return calculateSingleSedmEntry(form.thickness, String(electrodeSize), holes, qty, 1, customerConfig);
};

export const calculateSedmAmount = (form: CutForm, customerConfig?: SedmCustomerConfig): number => {
  return calculateSedmBreakdown(form, customerConfig).reduce((sum, entry) => sum + entry.entryCost, 0);
};
