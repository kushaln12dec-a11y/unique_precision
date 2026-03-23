import { apiUrl } from "./apiClient";
import type {
  DashboardDateRangePreset,
  DashboardRoleView,
  DashboardSummaryResponse,
} from "../types/dashboard";

export type DashboardSummaryParams = {
  view: DashboardRoleView;
  range: DashboardDateRangePreset;
  startDate?: string;
  endDate?: string;
  customer?: string;
  machine?: string;
  operator?: string;
  programmer?: string;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getDashboardSummary = async (
  params: DashboardSummaryParams
): Promise<DashboardSummaryResponse> => {
  const query = new URLSearchParams();
  query.append("view", params.view);
  query.append("range", params.range);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.customer) query.append("customer", params.customer);
  if (params.machine) query.append("machine", params.machine);
  if (params.operator) query.append("operator", params.operator);
  if (params.programmer) query.append("programmer", params.programmer);

  const res = await fetch(apiUrl(`/api/dashboard/summary?${query.toString()}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch dashboard summary");
  }

  return res.json();
};
