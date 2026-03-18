import type { JobEntry } from "../types/job";
import type { FilterValues } from "../components/FilterModal";
import { apiUrl } from "./apiClient";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Convert FilterValues to query parameters
const buildQueryParams = (
  filters?: FilterValues,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string
): string => {
  const params = new URLSearchParams();

  // Inline filters
  if (customerFilter) {
    params.append("customer", customerFilter);
  }
  if (descriptionFilter) {
    params.append("description", descriptionFilter);
  }
  if (createdByFilter) {
    params.append("createdBy", createdByFilter);
  }
  if (assignedToFilter) {
    params.append("assignedTo", assignedToFilter);
  }
  // Only add critical filter if explicitly true (checked)
  if (criticalFilter === true) {
    params.append("critical", "true");
  }

  // Modal filters
  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];

      // Handle range filters (min/max objects)
      if (typeof value === "object" && !Array.isArray(value) && value !== null) {
        if (key === "createdAt") {
          // Date range
          if (value.min) {
            params.append("createdAt_min", value.min as string);
          }
          if (value.max) {
            params.append("createdAt_max", value.max as string);
          }
        } else {
          // Number range
          if (value.min !== undefined) {
            params.append(`${key}_min`, String(value.min));
          }
          if (value.max !== undefined) {
            params.append(`${key}_max`, String(value.max));
          }
        }
      } else if (typeof value === "string" && value.trim() !== "") {
        // Text/select filters
        params.append(key, value);
      } else if (typeof value === "number") {
        // Number filters
        params.append(key, String(value));
      } else if (typeof value === "boolean") {
        // Boolean filters
        params.append(key, String(value));
      }
    });
  }

  return params.toString();
};

export const getJobs = async (
  filters?: FilterValues,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(filters, customerFilter, createdByFilter, assignedToFilter, criticalFilter, descriptionFilter);
  const url = queryString ? `/api/jobs?${queryString}` : "/api/jobs";
  return fetchJobList(url);
};

const normalizeJobListItem = (job: any): JobEntry => ({
  ...job,
  id: job._id || job.id,
  groupId: String(job.groupId ?? job.id),
  assignedTo: job.assignedTo || "Unassigned",
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

const fetchJobList = async (url: string): Promise<JobEntry[]> => {

  const res = await fetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const jobs = await res.json();
  return jobs.map(normalizeJobListItem);
};

export const getProgrammerJobs = async (
  filters?: FilterValues,
  customerFilter?: string,
  createdByFilter?: string,
  criticalFilter?: boolean,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(
    filters,
    customerFilter,
    createdByFilter,
    undefined,
    criticalFilter,
    descriptionFilter
  );
  const url = queryString ? `/api/jobs/programmer?${queryString}` : "/api/jobs/programmer";
  return fetchJobList(url);
};

export const getOperatorJobs = async (
  filters?: FilterValues,
  customerFilter?: string,
  createdByFilter?: string,
  assignedToFilter?: string,
  descriptionFilter?: string
): Promise<JobEntry[]> => {
  const queryString = buildQueryParams(
    filters,
    customerFilter,
    createdByFilter,
    assignedToFilter,
    false,
    descriptionFilter
  );
  const url = queryString ? `/api/jobs/operator?${queryString}` : "/api/jobs/operator";
  return fetchJobList(url);
};

export const getQcJobs = async (): Promise<JobEntry[]> => {
  return fetchJobList("/api/jobs/qc");
};

export const getJobById = async (id: string): Promise<JobEntry> => {
  const res = await fetch(apiUrl(`/api/jobs/${id}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job");
  }

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassigned",
  };
};

export const getJobsByGroupId = async (groupId: string): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(`/api/jobs/group/${groupId}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const jobs = await res.json();
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

export const createJobs = async (jobs: JobEntry[]): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl("/api/jobs"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobs),
  });

  if (!res.ok) {
    let message = "Failed to create jobs";
    try {
      const error = await res.json();
      message = error.message || error.error || message;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // keep default message
      }
    }
    throw new Error(message);
  }

  const createdJobs = await res.json();
  return Array.isArray(createdJobs) 
    ? createdJobs.map((job: any) => ({
        ...job,
        id: job._id || job.id,
        groupId: String(job.groupId ?? job.id),
        assignedTo: job.assignedTo || "Unassigned",
      }))
    : [{
        ...createdJobs,
        id: createdJobs._id || createdJobs.id,
        groupId: String(createdJobs.groupId ?? createdJobs.id),
        assignedTo: createdJobs.assignedTo || "Unassigned",
      }];
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

  const job = await res.json();
  return {
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassigned",
  };
};

export const updateJobsByGroupId = async (groupId: string, jobs: JobEntry[]): Promise<JobEntry[]> => {
  // Get existing jobs for this group
  const existingJobs = await getJobsByGroupId(groupId);
  
  const updatedJobs: JobEntry[] = [];
  
  // Update existing jobs or create new ones
  for (let i = 0; i < jobs.length; i++) {
    const jobData = jobs[i];
    const existingJob = existingJobs[i];
    
    if (existingJob && existingJob.id) {
      // Update existing job using PUT
      const updated = await updateJob(String(existingJob.id), jobData);
      updatedJobs.push(updated);
    } else {
      // Create new job if there are more cuts than before
      const created = await createJobs([jobData]);
      updatedJobs.push(...created);
    }
  }
  
  // Delete extra jobs if there are fewer cuts than before
  if (existingJobs.length > jobs.length) {
    const jobsToDelete = existingJobs.slice(jobs.length);
    for (const jobToDelete of jobsToDelete) {
      if (jobToDelete.id) {
        await deleteJob(String(jobToDelete.id));
      }
    }
  }
  
  return updatedJobs;
};

export const deleteJob = async (id: string): Promise<void> => {
  const res = await fetch(apiUrl(`/api/jobs/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete job");
  }
};

export const deleteJobsByGroupId = async (groupId: string): Promise<void> => {
  const res = await fetch(apiUrl(`/api/jobs/group/${groupId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete jobs");
  }
};

export const updateQcDecisionByGroupId = async (
  groupId: string,
  decision: "PENDING" | "APPROVED" | "REJECTED"
): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(`/api/jobs/group/${groupId}/qc-decision`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ decision }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update QC decision");
  }

  const jobs = await res.json();
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

export const setQcReportClosedByGroupId = async (
  groupId: string,
  closed: boolean = true
): Promise<JobEntry[]> => {
  const res = await fetch(apiUrl(`/api/jobs/group/${groupId}/qc-report-close`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ closed }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update QC report closed state");
  }

  const jobs = await res.json();
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: String(job.groupId ?? job.id),
    assignedTo: job.assignedTo || "Unassigned",
  }));
};
