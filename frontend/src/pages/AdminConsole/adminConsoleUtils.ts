import type { CustomerRate, MasterConfig } from "../../types/masterConfig";

export const normalizeOptionValue = (input: string): string => input.trim().replace(/\s+/g, " ");

export const DEFAULT_SEDM_CUSTOMER_PRICING = {
  sedm034Min: "60",
  sedm034PerMm: "6",
  sedm056Min: "50",
  sedm056PerMm: "4",
  sedm07Min: "40",
  sedm07PerMm: "3",
  sedm0812Min: "40",
  sedm0812PerMm: "2",
  sedm1520Min: "50",
  sedm1520PerMm: "3",
  sedm2225Min: "60",
  sedm2225PerMm: "4",
  sedm30Min: "80",
  sedm30PerMm: "6",
};

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
  { customer: "UPC001", rate: "100", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200", ...DEFAULT_SEDM_CUSTOMER_PRICING },
  { customer: "UPC002", rate: "10", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200", ...DEFAULT_SEDM_CUSTOMER_PRICING },
  { customer: "UPC003", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200", ...DEFAULT_SEDM_CUSTOMER_PRICING },
  { customer: "UPC004", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200", ...DEFAULT_SEDM_CUSTOMER_PRICING },
  { customer: "UPC005", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200", ...DEFAULT_SEDM_CUSTOMER_PRICING },
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
      sedm034Min: String(item.sedm034Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm034Min).trim(),
      sedm034PerMm: String(item.sedm034PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm034PerMm).trim(),
      sedm056Min: String(item.sedm056Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm056Min).trim(),
      sedm056PerMm: String(item.sedm056PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm056PerMm).trim(),
      sedm07Min: String(item.sedm07Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm07Min).trim(),
      sedm07PerMm: String(item.sedm07PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm07PerMm).trim(),
      sedm0812Min: String(item.sedm0812Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm0812Min).trim(),
      sedm0812PerMm: String(item.sedm0812PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm0812PerMm).trim(),
      sedm1520Min: String(item.sedm1520Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm1520Min).trim(),
      sedm1520PerMm: String(item.sedm1520PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm1520PerMm).trim(),
      sedm2225Min: String(item.sedm2225Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm2225Min).trim(),
      sedm2225PerMm: String(item.sedm2225PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm2225PerMm).trim(),
      sedm30Min: String(item.sedm30Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm30Min).trim(),
      sedm30PerMm: String(item.sedm30PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm30PerMm).trim(),
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
