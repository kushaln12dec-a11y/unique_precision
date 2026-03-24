import type { JobEntry } from "../types/job";
import { sortGroupEntriesParentFirst } from "../pages/Programmer/programmerUtils";
import { apiUrl } from "./apiClient";
import {
  buildQueryParams,
  fetchJobList,
  fetchPaginatedJobList,
  fetchSingleJob,
  getAuthHeaders,
  normalizeJobListItem,
  parseErrorMessage,
  type PaginatedResult,
  type PaginationParams,
} from "./jobApiUtils";

export type { PaginatedResult } from "./jobApiUtils";

export const getJobs = async (
  filters?: any,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, assignedToFilter, criticalFilter, descriptionFilter);
  return fetchJobList(queryString ? `/api/jobs?${queryString}` : "/api/jobs");
};

export const getProgrammerJobs = async (
  filters?: any,
  customerFilter?: string,
  createdByFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, undefined, criticalFilter, descriptionFilter);
  return fetchJobList(queryString ? `/api/jobs/programmer?${queryString}` : "/api/jobs/programmer");
};

export const getProgrammerJobsPage = async (
  filters?: any,
  customerFilter?: string,
  createdByFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<JobEntry>> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, undefined, criticalFilter, descriptionFilter, pagination);
  return fetchPaginatedJobList(queryString ? `/api/jobs/programmer?${queryString}` : "/api/jobs/programmer");
};

export const getOperatorJobs = async (
  filters?: any,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, assignedToFilter, false, descriptionFilter);
  return fetchJobList(queryString ? `/api/jobs/operator?${queryString}` : "/api/jobs/operator");
};

export const getOperatorJobsPage = async (
  filters?: any,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  descriptionFilter?: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<JobEntry>> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, assignedToFilter, false, descriptionFilter, pagination);
  return fetchPaginatedJobList(queryString ? `/api/jobs/operator?${queryString}` : "/api/jobs/operator");
};

export const getQcJobs = async (): Promise<JobEntry[]> => fetchJobList("/api/jobs/qc");

export const getQcJobsPage = async (pagination: PaginationParams = {}): Promise<PaginatedResult<JobEntry>> => {
  const params = new URLSearchParams();
  if (pagination.offset !== undefined) params.append("offset", String(Math.max(0, pagination.offset)));
  if (pagination.limit !== undefined) params.append("limit", String(Math.max(1, pagination.limit)));
  const queryString = params.toString();
  return fetchPaginatedJobList(queryString ? `/api/jobs/qc?${queryString}` : "/api/jobs/qc");
};

export const getJobById = async (id: string): Promise<JobEntry> => {
  return normalizeJobListItem(await fetchSingleJob(`/api/jobs/${id}`, "Failed to fetch job"));
};

export const getJobsByGroupId = async (groupId: string): Promise<JobEntry[]> => {
  const jobs = await fetchSingleJob(`/api/jobs/group/${groupId}`, "Failed to fetch jobs");
  return sortGroupEntriesParentFirst(jobs.map(normalizeJobListItem));
};

export const createJobs = async (jobs: JobEntry[]): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl("/api/jobs"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobs),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Failed to create jobs"));
  }

  const createdJobs = await res.json();
  return (Array.isArray(createdJobs) ? createdJobs : [createdJobs]).map(normalizeJobListItem);
};

export const updateJob = async (id: string, jobData: Partial<JobEntry>): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/jobs/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update job");
  }
  return normalizeJobListItem(await res.json());
};

export const updateJobsByGroupId = async (groupId: string, jobs: JobEntry[]): Promise<JobEntry[]> => {
  const existingJobs = sortGroupEntriesParentFirst(await getJobsByGroupId(groupId));
  const updatedJobs: JobEntry[] = [];

  for (let index = 0; index < jobs.length; index++) {
    const jobData = jobs[index];
    const existingJob = existingJobs[index];
    if (existingJob?.id) {
      updatedJobs.push(await updateJob(String(existingJob.id), jobData));
    } else {
      updatedJobs.push(...await createJobs([jobData]));
    }
  }

  if (existingJobs.length > jobs.length) {
    for (const jobToDelete of existingJobs.slice(jobs.length)) {
      if (jobToDelete.id) await deleteJob(String(jobToDelete.id));
    }
  }

  return updatedJobs;
};

export const deleteJob = async (id: string): Promise<void> => {
  const res = await fetch(apiUrl(`/api/jobs/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete job");
};

export const deleteJobsByGroupId = async (groupId: string): Promise<void> => {
  const res = await fetch(apiUrl(`/api/jobs/group/${groupId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete jobs");
};

const updateGroupDecision = async (
  route: string,
  body: Record<string, unknown>,
  fallback: string
): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(route), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || fallback);
  }
  const jobs = await res.json();
  return jobs.map(normalizeJobListItem);
};

export const updateQcDecisionByGroupId = async (
  groupId: string,
  decision: "PENDING" | "APPROVED" | "REJECTED"
): Promise<JobEntry[]> => {
  return updateGroupDecision(`/api/jobs/group/${groupId}/qc-decision`, { decision }, "Failed to update QC decision");
};

export const setQcReportClosedByGroupId = async (
  groupId: string,
  closed: boolean = true
): Promise<JobEntry[]> => {
  return updateGroupDecision(`/api/jobs/group/${groupId}/qc-report-close`, { closed }, "Failed to update QC report closed state");
};
