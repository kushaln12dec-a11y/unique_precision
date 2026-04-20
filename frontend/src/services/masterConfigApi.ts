import type { MasterConfig } from "../types/masterConfig";
import { apiUrl } from "./apiClient";
import { DEFAULT_SEDM_CUSTOMER_PRICING } from "../pages/AdminConsole/adminConsoleUtils";

let masterConfigCache:
  | {
      value: MasterConfig;
      expiresAt: number;
    }
  | null = null;
let masterConfigPromise: Promise<MasterConfig> | null = null;
const MASTER_CONFIG_TTL_MS = 60_000;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getMasterConfig = async (): Promise<MasterConfig> => {
  const now = Date.now();
  if (masterConfigCache && masterConfigCache.expiresAt > now) {
    return masterConfigCache.value;
  }

  if (masterConfigPromise) {
    return masterConfigPromise;
  }

  masterConfigPromise = fetch(apiUrl("/api/master-config"), {
    method: "GET",
    headers: getAuthHeaders(),
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch master config");
      }

      const data = await res.json();
      const normalized: MasterConfig = {
        customers: Array.isArray(data.customers)
          ? data.customers.map((item: any) => ({
              customer: String(item?.customer || ""),
              rate: String(item?.rate || ""),
              settingHours: String(item?.settingHours || ""),
              thicknessRateUpto100: String(item?.thicknessRateUpto100 || ""),
              thicknessRateAbove100: String(item?.thicknessRateAbove100 || ""),
              sedm034Min: String(item?.sedm034Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm034Min),
              sedm034PerMm: String(item?.sedm034PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm034PerMm),
              sedm056Min: String(item?.sedm056Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm056Min),
              sedm056PerMm: String(item?.sedm056PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm056PerMm),
              sedm07Min: String(item?.sedm07Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm07Min),
              sedm07PerMm: String(item?.sedm07PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm07PerMm),
              sedm0812Min: String(item?.sedm0812Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm0812Min),
              sedm0812PerMm: String(item?.sedm0812PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm0812PerMm),
              sedm1520Min: String(item?.sedm1520Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm1520Min),
              sedm1520PerMm: String(item?.sedm1520PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm1520PerMm),
              sedm2225Min: String(item?.sedm2225Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm2225Min),
              sedm2225PerMm: String(item?.sedm2225PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm2225PerMm),
              sedm30Min: String(item?.sedm30Min || DEFAULT_SEDM_CUSTOMER_PRICING.sedm30Min),
              sedm30PerMm: String(item?.sedm30PerMm || DEFAULT_SEDM_CUSTOMER_PRICING.sedm30PerMm),
            }))
          : [],
        materials: Array.isArray(data.materials) ? data.materials : [],
        passOptions: Array.isArray(data.passOptions) ? data.passOptions : [],
        sedmElectrodeOptions: Array.isArray(data.sedmElectrodeOptions) ? data.sedmElectrodeOptions : [],
        machineOptions: Array.isArray(data.machineOptions) ? data.machineOptions : [],
        sedmThOptions: Array.isArray(data.sedmThOptions) ? data.sedmThOptions : [],
        settingHoursPerSetting: Number(data.settingHoursPerSetting) || 0.5,
        thicknessRateUpto100: Number(data.thicknessRateUpto100) || 1500,
        thicknessRateAbove100: Number(data.thicknessRateAbove100) || 1200,
        complexExtraHours: Number(data.complexExtraHours) || 1,
        pipExtraHours: Number(data.pipExtraHours) || 1,
      };

      masterConfigCache = {
        value: normalized,
        expiresAt: Date.now() + MASTER_CONFIG_TTL_MS,
      };

      return normalized;
    })
    .finally(() => {
      masterConfigPromise = null;
    });

  return masterConfigPromise;
};

export const updateMasterConfig = async (payload: MasterConfig): Promise<MasterConfig> => {
  const res = await fetch(apiUrl("/api/master-config"), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update master config");
  }

  masterConfigCache = null;
  masterConfigPromise = null;
  return getMasterConfig();
};
