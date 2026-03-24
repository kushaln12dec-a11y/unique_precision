import type { CustomerRate, MasterConfig } from "../../types/masterConfig";

export const normalizeOptionValue = (input: string): string => input.trim().replace(/\s+/g, " ");

export const sanitizeOptions = (values: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeOptionValue(value);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    next.push(normalized);
  });

  return next;
};

export const DEFAULT_CUSTOMERS: CustomerRate[] = [
  { customer: "UPC001", rate: "100", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC002", rate: "10", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC003", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC004", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC005", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
];

export const normalizeCustomerRows = (values: CustomerRate[]): CustomerRate[] => {
  const unique = new Map<string, CustomerRate>();

  values.forEach((item) => {
    const customer = String(item.customer || "").trim().toUpperCase();
    if (!customer) return;

    unique.set(customer, {
      customer,
      rate: String(item.rate || "").trim(),
      settingHours: String(item.settingHours || "").trim(),
      thicknessRateUpto100: String(item.thicknessRateUpto100 || "").trim(),
      thicknessRateAbove100: String(item.thicknessRateAbove100 || "").trim(),
    });
  });

  return Array.from(unique.values());
};

export const serialize = (value: unknown) => JSON.stringify(value);

export type AdminSection =
  | "customers"
  | "materials"
  | "pass"
  | "sedm"
  | "machines"
  | "hours"
  | "thickness"
  | null;

export type AdminToastState = {
  message: string;
  variant: "success" | "error" | "info";
  visible: boolean;
};

export type AdminSnapshot = {
  customers: CustomerRate[];
  materials: string[];
  passOptions: string[];
  electrodeOptions: string[];
  machineOptions: string[];
  hoursConfig: Pick<MasterConfig, "settingHoursPerSetting" | "complexExtraHours" | "pipExtraHours"> | null;
  thicknessConfig: Pick<MasterConfig, "thicknessRateUpto100" | "thicknessRateAbove100"> | null;
};
