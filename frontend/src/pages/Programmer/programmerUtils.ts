export type CutForm = {
  customer: string;
  rate: string;
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
  sedm: "Yes" | "No";
  priority: "Low" | "Medium" | "High";
  description: string;
  cutImage: string | null;
  critical: boolean;
  pipFinish: boolean;
};

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
  setting: "0",
  qty: "1",
  sedm: "No",
  priority: "Medium",
  description: "",
  cutImage: null,
  critical: false,
  pipFinish: false,
};

export const calculateTotals = (form: CutForm) => {
  const rate = Number(form.rate) || 0;
  const cut = Number(form.cut) || 0;
  const thickness = Number(form.thickness) || 0;
  const passMultiplier = PASS_MAP[form.passLevel] || 1;
  const settingLevel = Number(form.setting) || 0;
  const qty = Number(form.qty) || 0;

  const divisor = thickness > 100 ? 1200 : 1500;
  const cutHoursPerPiece = (cut * thickness) / divisor * passMultiplier;
  const settingHours = settingLevel * 0.5;
  const totalHrs = cutHoursPerPiece + settingHours;
  const totalAmount = totalHrs * rate * qty;

  return {
    totalHrs,
    totalAmount,
  };
};
