import type { JobEntry } from "../types/job";

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

  const res = await fetch(url, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

// Get operator job by ID
export const getOperatorJobById = async (id: string): Promise<JobEntry> => {
  const res = await fetch(`/api/operator/jobs/${id}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  };
};

// Get operator jobs by groupId
export const getOperatorJobsByGroupId = async (groupId: number): Promise<JobEntry[]> => {
  const res = await fetch(`/api/operator/jobs/group/${groupId}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

// Update operator job
export const updateOperatorJob = async (id: string, jobData: Partial<JobEntry>): Promise<JobEntry> => {
  const res = await fetch(`/api/operator/jobs/${id}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  };
};

// Bulk update operator jobs
export const bulkUpdateOperatorJobs = async (
  jobIds: (string | number)[],
  updateData: Partial<JobEntry>
): Promise<{ message: string; modifiedCount: number }> => {
  const res = await fetch("/api/operator/jobs/bulk", {
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
