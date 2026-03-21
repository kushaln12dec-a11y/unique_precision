import type { MasterConfig } from "../types/masterConfig";
import { apiUrl } from "./apiClient";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getMasterConfig = async (): Promise<MasterConfig> => {
  const res = await fetch(apiUrl("/api/master-config"), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch master config");
  }

  const data = await res.json();
  return {
    customers: Array.isArray(data.customers)
      ? data.customers.map((item: any) => ({
          customer: String(item?.customer || ""),
          rate: String(item?.rate || ""),
          settingHours: String(item?.settingHours || ""),
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

  return getMasterConfig();
};
