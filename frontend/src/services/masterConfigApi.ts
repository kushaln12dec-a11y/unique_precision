import type { MasterConfig } from "../types/masterConfig";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getMasterConfig = async (): Promise<MasterConfig> => {
  const res = await fetch("/api/master-config", {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch master config");
  }

  const data = await res.json();
  return {
    customers: Array.isArray(data.customers) ? data.customers : [],
    materials: Array.isArray(data.materials) ? data.materials : [],
    passOptions: Array.isArray(data.passOptions) ? data.passOptions : [],
    sedmElectrodeOptions: Array.isArray(data.sedmElectrodeOptions) ? data.sedmElectrodeOptions : [],
    sedmThOptions: Array.isArray(data.sedmThOptions) ? data.sedmThOptions : [],
    settingHoursPerSetting: Number(data.settingHoursPerSetting) || 0.5,
    complexExtraHours: Number(data.complexExtraHours) || 1,
    pipExtraHours: Number(data.pipExtraHours) || 1,
  };
};

export const updateMasterConfig = async (payload: MasterConfig): Promise<MasterConfig> => {
  const res = await fetch("/api/master-config", {
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

