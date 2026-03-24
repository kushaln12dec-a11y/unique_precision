import type { CalculationResult, CutForm } from "../programmerUtils";

export type CutTotals = {
  totalHrs: number;
  totalAmount: number;
  wedmAmount: number;
  sedmAmount: number;
  estimatedTime: number;
  wedmBreakdown: CalculationResult["wedmBreakdown"];
  sedmBreakdown: CalculationResult["sedmBreakdown"];
};

export type OperationRow = {
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
};

export type CutSectionProps = {
  cut: CutForm;
  index: number;
  cutTotals: CutTotals;
  isCollapsed: boolean;
  isSaved: boolean;
  fieldErrors: Record<string, string>;
  isFirstCut: boolean;
  openPriorityDropdown: number | null;
  onToggle: () => void;
  onCutChange: <K extends keyof CutForm>(field: K) => (value: CutForm[K]) => void;
  onImageChange: (files: File[]) => void;
  onRemoveImage: (imageIndex: number) => void;
  onSedmChange: (value: CutForm["sedm"]) => void;
  onSaveCut: () => void;
  onClearCut: () => void;
  onRemoveCut: () => void;
  onPriorityDropdownToggle: () => void;
  onSedmModalOpen: () => void;
  isAdmin: boolean;
  customerOptions: Array<{ customer: string; rate: string }>;
  materialOptions: string[];
  passOptions: string[];
};
