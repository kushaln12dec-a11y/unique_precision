import type { JobEntry } from "../types/job";
import { apiUrl } from "./apiClient";

export type PaginatedOperatorJobs = {
  items: JobEntry[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type CaptureOperatorInputPayload = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string;
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  quantityIndex?: number;
  captureMode?: "SINGLE" | "RANGE";
  fromQty?: number;
  toQty?: number;
  overwriteExisting?: boolean;
  operatorLogId?: string;
};

export type UpdateQaStatusPayload = {
  quantityNumbers: number[];
  status: "READY_FOR_QA" | "SENT_TO_QA";
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Get operator jobs
export const getOperatorJobs = async (
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string
): Promise<JobEntry[]> => {
  const params = new URLSearchParams();
  if (customerFilter) params.append("customer", customerFilter);
  if (createdByFilter) params.append("createdBy", createdByFilter);
  if (assignedToFilter) params.append("assignedTo", assignedToFilter);

  const url = params.toString() ? `/api/operator/jobs?${params.toString()}` : "/api/operator/jobs";

  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch operator jobs");
  }

  const jobs = await res.json();
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  }));
};

export const getOperatorJobsPage = async (
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  pagination: { offset?: number; limit?: number } = {}
): Promise<PaginatedOperatorJobs> => {
  const params = new URLSearchParams();
  if (customerFilter) params.append("customer", customerFilter);
  if (createdByFilter) params.append("createdBy", createdByFilter);
  if (assignedToFilter) params.append("assignedTo", assignedToFilter);
  if (pagination.offset !== undefined) params.append("offset", String(Math.max(0, pagination.offset)));
  if (pagination.limit !== undefined) params.append("limit", String(Math.max(1, pagination.limit)));

  const url = params.toString() ? `/api/operator/jobs?${params.toString()}` : "/api/operator/jobs";

  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch operator jobs");
  }

  const payload = await res.json();
  const items = Array.isArray(payload?.items)
    ? payload.items.map((job: any) => ({
        ...job,
        id: job._id || job.id,
        groupId: String(job.groupId ?? job.id),
        assignedTo: job.assignedTo || "Unassign",
      }))
    : [];

  return {
    items,
    total: Number(payload?.total || 0),
    offset: Number(payload?.offset || 0),
    limit: Number(payload?.limit || items.length || 0),
    hasMore: Boolean(payload?.hasMore),
  };
};

// Get operator job by ID
export const getOperatorJobById = async (id: string): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/operator/jobs/${id}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch operator job");
  }

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  };
};

// Get operator jobs by groupId
export const getOperatorJobsByGroupId = async (groupId: string): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(`/api/operator/jobs/group/${groupId}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch operator jobs");
  }

  const jobs = await res.json();
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  }));
};

// Update operator job
export const updateOperatorJob = async (id: string, jobData: Partial<JobEntry>): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/operator/jobs/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update operator job");
  }

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  };
};

// Capture operator input (POST)
export const captureOperatorInput = async (id: string, inputData: CaptureOperatorInputPayload): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/operator/jobs/${id}/capture-input`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(inputData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to capture operator input");
  }

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  };
};

export const updateOperatorQaStatus = async (
  id: string,
  payload: UpdateQaStatusPayload
): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/operator/jobs/${id}/qa-status`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update QC status");
  }

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassign",
  };
};

// Bulk update operator jobs
export const bulkUpdateOperatorJobs = async (
  jobIds: (string | number)[],
  updateData: Partial<JobEntry>
): Promise<{ message: string; modifiedCount: number }> => {
  const res = await fetch(apiUrl("/api/operator/jobs/bulk"), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ jobIds, updateData }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to bulk update operator jobs");
  }

  return res.json();
};
