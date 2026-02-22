import type { EmployeeLog } from "../types/employeeLog";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

type GetEmployeeLogsParams = {
  role?: "PROGRAMMER" | "OPERATOR" | "QC";
  status?: "IN_PROGRESS" | "COMPLETED";
  search?: string;
  startDate?: string;
  endDate?: string;
};

export const getEmployeeLogs = async (params: GetEmployeeLogsParams = {}): Promise<EmployeeLog[]> => {
  const query = new URLSearchParams();
  if (params.role) query.append("role", params.role);
  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);

  const url = query.toString() ? `/api/employee-logs?${query.toString()}` : "/api/employee-logs";
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch employee logs");
  }

  return res.json();
};

export const startProgrammerJobLog = async (payload: { refNumber?: string } = {}): Promise<EmployeeLog> => {
  const res = await fetch("/api/employee-logs/programmer/start", {
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
  jobGroupId?: number;
  refNumber?: string;
  customer?: string;
  description?: string;
  settingsCount?: number;
  quantityCount?: number;
}): Promise<EmployeeLog> => {
  const res = await fetch("/api/employee-logs/programmer/complete", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to complete programmer log");
  }

  return res.json();
};

export const startOperatorProductionLog = async (payload: {
  jobId: string | number;
  jobGroupId?: number;
  refNumber?: string;
  customer?: string;
  description?: string;
  settingLabel?: string;
  fromQty?: number;
  toQty?: number;
  quantityCount?: number;
  startedAt?: string;
}): Promise<EmployeeLog> => {
  const res = await fetch("/api/employee-logs/operator/start", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to start operator production log");
  }

  return res.json();
};
