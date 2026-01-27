import type { JobEntry } from "../types/job";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getJobs = async (): Promise<JobEntry[]> => {
  const res = await fetch("/api/jobs", {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }

  const jobs = await res.json();
  // Convert MongoDB _id to id and ensure groupId exists
  return jobs.map((job: any) => ({
    ...job,
    id: job._id || job.id,
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

export const getJobById = async (id: string): Promise<JobEntry> => {
  const res = await fetch(`/api/jobs/${id}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  };
};

export const getJobsByGroupId = async (groupId: number): Promise<JobEntry[]> => {
  const res = await fetch(`/api/jobs/group/${groupId}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  }));
};

export const createJobs = async (jobs: JobEntry[]): Promise<JobEntry[]> => {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(jobs),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create jobs");
  }

  const createdJobs = await res.json();
  return Array.isArray(createdJobs) 
    ? createdJobs.map((job: any) => ({
        ...job,
        id: job._id || job.id,
        groupId: job.groupId ?? job.id,
        assignedTo: job.assignedTo || "Unassigned",
      }))
    : [{
        ...createdJobs,
        id: createdJobs._id || createdJobs.id,
        groupId: createdJobs.groupId ?? createdJobs.id,
        assignedTo: createdJobs.assignedTo || "Unassigned",
      }];
};

export const updateJob = async (id: string, jobData: Partial<JobEntry>): Promise<JobEntry> => {
  const res = await fetch(`/api/jobs/${id}`, {
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
    groupId: job.groupId ?? job.id,
    assignedTo: job.assignedTo || "Unassigned",
  };
};

export const deleteJob = async (id: string): Promise<void> => {
  const res = await fetch(`/api/jobs/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete job");
  }
};

export const deleteJobsByGroupId = async (groupId: number): Promise<void> => {
  const res = await fetch(`/api/jobs/group/${groupId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete jobs");
  }
};
