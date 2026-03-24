import type { FilterValues } from "../components/FilterModal";
import type { JobEntry } from "../types/job";
import { apiUrl } from "./apiClient";

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type PaginationParams = {
  offset?: number;
  limit?: number;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const buildQueryParams = (
  filters?: FilterValues,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string,
  pagination?: PaginationParams
): string => {
  const params = new URLSearchParams();

  if (customerFilter) params.append("customer", customerFilter);
  if (descriptionFilter) params.append("description", descriptionFilter);
  if (createdByFilter) params.append("createdBy", createdByFilter);
  if (assignedToFilter) params.append("assignedTo", assignedToFilter);
  if (criticalFilter === true) params.append("critical", "true");

  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (typeof value === "object" && !Array.isArray(value) && value !== null) {
        if (key === "createdAt") {
          if (value.min) params.append("createdAt_min", value.min as string);
          if (value.max) params.append("createdAt_max", value.max as string);
          return;
        }
        if (value.min !== undefined) params.append(`${key}_min`, String(value.min));
        if (value.max !== undefined) params.append(`${key}_max`, String(value.max));
        return;
      }
      if (typeof value === "string" && value.trim() !== "") {
        params.append(key, value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        params.append(key, String(value));
      }
    });
  }

  if (pagination?.offset !== undefined) params.append("offset", String(Math.max(0, pagination.offset)));
  if (pagination?.limit !== undefined) params.append("limit", String(Math.max(1, pagination.limit)));

  return params.toString();
};

export const normalizeJobListItem = (job: any): JobEntry => ({
  ...job,
  id: job._id || job.id,
  groupId: String(job.groupId ?? job.id),
  assignedTo: job.assignedTo || "Unassign",
  customer: String(job.customer ?? ""),
  rate: String(job.rate ?? ""),
  cut: String(job.cut ?? ""),
  thickness: String(job.thickness ?? ""),
  passLevel: String(job.passLevel ?? ""),
  setting: String(job.setting ?? ""),
  qty: String(job.qty ?? ""),
  sedm: job.sedm ?? "No",
  sedmSelectionType: job.sedmSelectionType ?? "range",
  sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
  sedmStandardValue: job.sedmStandardValue ?? "",
  sedmLengthType: job.sedmLengthType ?? "min",
  sedmOver20Length: String(job.sedmOver20Length ?? ""),
  sedmLengthValue: String(job.sedmLengthValue ?? ""),
  sedmHoles: String(job.sedmHoles ?? "1"),
  sedmEntriesJson: String(job.sedmEntriesJson ?? ""),
  operationRowsJson: String(job.operationRowsJson ?? ""),
  material: String(job.material ?? ""),
  priority: job.priority ?? "Medium",
  description: String(job.description ?? ""),
  remark: String(job.remark ?? ""),
  programRefFile: String(job.programRefFile ?? ""),
  cutImage: Array.isArray(job.cutImage) ? job.cutImage : job.cutImage ? [job.cutImage] : [],
  critical: Boolean(job.critical),
  pipFinish: Boolean(job.pipFinish),
  refNumber: String(job.refNumber ?? ""),
  totalHrs: Number(job.totalHrs ?? 0),
  totalAmount: Number(job.totalAmount ?? 0),
  createdAt: String(job.createdAt ?? ""),
  createdBy: String(job.createdBy ?? ""),
  machineNumber: String(job.machineNumber ?? ""),
  quantityQaStates: job.quantityQaStates ?? {},
  operatorCaptures: Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [],
});

const getListPayload = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const fetchJobList = async (url: string): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const payload = await res.json();
  return getListPayload(payload).map(normalizeJobListItem);
};

export const fetchPaginatedJobList = async (url: string): Promise<PaginatedResult<JobEntry>> => {
  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");

  const payload = await res.json();
  const items = getListPayload(payload).map(normalizeJobListItem);
  return {
    items,
    total: Number(payload?.total || items.length || 0),
    offset: Number(payload?.offset || 0),
    limit: Number(payload?.limit || items.length || 0),
    hasMore: Boolean(payload?.hasMore),
  };
};

export const fetchSingleJob = async (url: string, errorMessage: string): Promise<any> => {
  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
};

export const parseErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  try {
    const error = await res.json();
    return error.message || error.error || fallback;
  } catch {
    try {
      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
};
