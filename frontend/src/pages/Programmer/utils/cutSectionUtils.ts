import type { CutForm } from "../programmerUtils";
import type { OperationRow } from "../types/cutSection";

export const SEDM_OPTIONS: Array<{ value: CutForm["sedm"]; label: string }> = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];

export const normalizeNonNegativeNumberInput = (value: string): string => {
  const raw = String(value || "");
  if (raw === "") return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "";
  return parsed < 0 ? "0" : raw;
};

export const parseOperationRows = (cut: CutForm): OperationRow[] => {
  const fallbackRow: OperationRow = {
    cut: cut.cut,
    thickness: cut.thickness,
    passLevel: cut.passLevel,
    setting: cut.setting,
    qty: cut.qty,
  };

  if (!cut.operationRowsJson || !cut.operationRowsJson.trim()) return [fallbackRow];

  try {
    const parsed = JSON.parse(cut.operationRowsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return [fallbackRow];
    const rows = parsed
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        cut: String((row as any).cut ?? (row as any).cutLength ?? ""),
        thickness: String((row as any).thickness ?? (row as any).thk ?? ""),
        passLevel: String((row as any).passLevel ?? (row as any).pass ?? ""),
        setting: String((row as any).setting ?? (row as any).settingHrs ?? ""),
        qty: String((row as any).qty ?? (row as any).quantity ?? ""),
      }));
    return rows.length > 0 ? rows : [fallbackRow];
  } catch {
    return [fallbackRow];
  }
};
