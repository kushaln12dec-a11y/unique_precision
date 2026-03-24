import { SEDM_PRICING, getEffectiveThickness } from "../programmerUtils";

export type SEDMEntry = {
  thickness: string;
  lengthValue: string;
  lengthType: "min" | "per";
  holes: string;
};

export const splitThicknessParts = (value: string): string[] => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (!raw.includes("/")) return [raw];
  const [leftRaw = "", rightRaw = ""] = raw.split("/", 2);
  const left = leftRaw.trim();
  const right = rightRaw.trim();
  if (!left) return [];
  return right ? [left, right] : [left];
};

export const calculateSingleSedmAmount = (entry: SEDMEntry, qty: number): number => {
  const electrodeSize = entry.lengthValue ? Number(entry.lengthValue) : null;
  if (!electrodeSize || !entry.lengthValue) return 0;
  const pricing = SEDM_PRICING.find((item) => electrodeSize >= item.min && electrodeSize <= item.max);
  if (!pricing) return 0;

  const raw = String(entry.thickness || "").trim();
  const [leftRaw = "", rightRaw = ""] = raw.includes("/") ? raw.split("/", 2) : [raw, ""];
  const values: number[] = [];
  const leftToken = leftRaw.trim();
  const rightToken = rightRaw.trim();
  const left = Number(leftToken);
  const right = Number(rightToken);
  if (leftToken !== "" && Number.isFinite(left)) values.push(left);
  if (rightToken !== "" && Number.isFinite(right)) values.push(right);
  if (values.length === 0) return 0;

  const holes = Number(entry.holes) || 1;
  return values.reduce((sum, thickness) => {
    const effectiveThk = getEffectiveThickness(thickness);
    const baseValue = effectiveThk > 20 ? thickness * pricing.perMm : pricing.min20;
    return sum + (baseValue * holes * qty);
  }, 0);
};

export const buildInitialSedmEntries = (cut: {
  thickness?: string;
  sedmLengthValue?: string;
  sedmLengthType?: string;
  sedmHoles?: string;
  sedmEntriesJson?: string;
}): SEDMEntry[] => {
  if (cut.sedmEntriesJson) {
    try {
      const entries: Array<{ thickness: string; lengthValue: string; lengthType?: string; holes: string }> = JSON.parse(cut.sedmEntriesJson);
      if (entries.length > 0) {
        return entries.map((entry) => ({
          thickness: entry.thickness || cut.thickness || "",
          lengthValue: entry.lengthValue || "",
          lengthType: (entry.lengthType as "min" | "per") || (cut.sedmLengthType as "min" | "per") || "min",
          holes: entry.holes || "1",
        }));
      }
    } catch {
      return [];
    }
  }

  return [{
    thickness: cut.thickness || "",
    lengthValue: cut.sedmLengthValue || "",
    lengthType: (cut.sedmLengthType as "min" | "per") || "min",
    holes: cut.sedmHoles || "1",
  }];
};
