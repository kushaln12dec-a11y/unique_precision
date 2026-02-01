export type IdleTimeConfig = {
  _id?: string;
  idleTimeType: "Power Break" | "Machine Breakdown" | "Vertical Dial" | "Cleaning" | "Consumables Change";
  durationMinutes: number;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Get all idle time configurations
export const getIdleTimeConfigs = async (): Promise<IdleTimeConfig[]> => {
  const res = await fetch("/api/idle-time-config", {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch idle time configurations");
  }

  return res.json();
};

// Get single idle time configuration
export const getIdleTimeConfig = async (type: string): Promise<IdleTimeConfig> => {
  const res = await fetch(`/api/idle-time-config/${type}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch idle time configuration");
  }

  return res.json();
};

// Create or update idle time configuration
export const upsertIdleTimeConfig = async (
  idleTimeType: string,
  durationMinutes: number
): Promise<IdleTimeConfig> => {
  const res = await fetch("/api/idle-time-config", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ idleTimeType, durationMinutes }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create/update idle time configuration");
  }

  return res.json();
};

// Update idle time configuration
export const updateIdleTimeConfig = async (
  type: string,
  durationMinutes: number
): Promise<IdleTimeConfig> => {
  const res = await fetch(`/api/idle-time-config/${type}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ durationMinutes }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update idle time configuration");
  }

  return res.json();
};

// Delete idle time configuration
export const deleteIdleTimeConfig = async (type: string): Promise<void> => {
  const res = await fetch(`/api/idle-time-config/${type}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete idle time configuration");
  }
};
