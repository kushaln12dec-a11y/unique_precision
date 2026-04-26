export const JOBS_UPDATED_EVENT = "jobs:updated";

export type JobsUpdateEvent = {
  type: "jobs:updated";
  groupId?: string;
  jobId?: string;
  updatedBy?: string;
  updatedAt: string;
  source?: string;
};
