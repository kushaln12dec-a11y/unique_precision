import type { EmployeeLog, EmployeeLogQueryStatus } from "../types/employeeLog";
import { apiUrl } from "./apiClient";

export type PaginatedEmployeeLogs = {
  items: EmployeeLog[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

type GetEmployeeLogsParams = {
  role?: "PROGRAMMER" | "OPERATOR" | "QC";
  status?: EmployeeLogQueryStatus;
  search?: string;
  machine?: string;
  startDate?: string;
  endDate?: string;
  offset?: number;
  limit?: number;
};

const getEmployeeLogItems = (payload: any): EmployeeLog[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const getEmployeeLogs = async (params: GetEmployeeLogsParams = {}): Promise<EmployeeLog[]> => {
  const query = new URLSearchParams();
  if (params.role) query.append("role", params.role);
  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  if (params.machine) query.append("machine", params.machine);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);

  const url = query.toString() ? `/api/employee-logs?${query.toString()}` : "/api/employee-logs";
  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch employee logs");
  }

  const payload = await res.json();
  return getEmployeeLogItems(payload);
};

export const getEmployeeLogsPage = async (
  params: GetEmployeeLogsParams = {}
): Promise<PaginatedEmployeeLogs> => {
  const query = new URLSearchParams();
  if (params.role) query.append("role", params.role);
  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  if (params.machine) query.append("machine", params.machine);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.offset !== undefined) query.append("offset", String(Math.max(0, params.offset)));
  if (params.limit !== undefined) query.append("limit", String(Math.max(1, params.limit)));

  const url = query.toString() ? `/api/employee-logs?${query.toString()}` : "/api/employee-logs";
  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch employee logs");
  }

  const payload = await res.json();
  const items = getEmployeeLogItems(payload);
  return {
    items,
    total: Number(payload?.total || items.length || 0),
    offset: Number(payload?.offset || 0),
    limit: Number(payload?.limit || items.length || 0),
    hasMore: Boolean(payload?.hasMore),
  };
};

export const startProgrammerJobLog = async (payload: { refNumber?: string } = {}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/programmer/start"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to start programmer log");
  }

  return res.json();
};

export const completeProgrammerJobLog = async (payload: {
  logId?: string;
  jobGroupId?: string;
  refNumber?: string;
  customer?: string;
  description?: string;
  settingsCount?: number;
  quantityCount?: number;
}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/programmer/complete"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to complete programmer log");
  }

  return res.json();
};

export const rejectProgrammerJobLog = async (payload: {
  logId?: string;
}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/programmer/reject"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to reject programmer log");
  }

  return res.json();
};

export const startOperatorProductionLog = async (payload: {
  jobId: string | number;
  jobGroupId?: string;
  refNumber?: string;
  customer?: string;
  description?: string;
  settingLabel?: string;
  fromQty?: number;
  toQty?: number;
  quantityCount?: number;
  startedAt?: string;
  machineNumber?: string;
  opsName?: string;
}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/operator/start"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to start operator production log" }));
    throw new Error(error.message || "Failed to start operator production log");
  }

  return res.json();
};

export const completeOperatorProductionLog = async (payload: {
  logId?: string;
  status?: "COMPLETED" | "REJECTED";
  endedAt?: string;
  machineNumber?: string;
  opsName?: string;
  machineHrs?: string;
  idleTime?: string;
  idleTimeDuration?: string;
}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/operator/complete"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to complete operator production log" }));
    throw new Error(error.message || "Failed to complete operator production log");
  }

  return res.json();
};

export const createOperatorTaskSwitchLog = async (payload: {
  idleTime: string;
  remark: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}): Promise<EmployeeLog> => {
  const res = await fetch(apiUrl("/api/employee-logs/operator/task-switch"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to save task switch log" }));
    throw new Error(error.message || "Failed to save task switch log");
  }

  return res.json();
};
