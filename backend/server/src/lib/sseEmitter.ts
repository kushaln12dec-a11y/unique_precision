import { EventEmitter } from "events";

export const JOBS_UPDATE_EVENT = "jobs:update";

export type JobsUpdateEvent = {
  type: "jobs:updated";
  groupId?: string;
  jobId?: string;
  updatedBy?: string;
  updatedAt: string;
  source?: string;
};

export const sseEmitter = new EventEmitter();

sseEmitter.setMaxListeners(200);

export const emitJobsUpdated = (payload: {
  groupId?: string | number | bigint | null;
  jobId?: string | number | bigint | null;
  updatedBy?: string | null;
  source?: string;
}) => {
  const event: JobsUpdateEvent = {
    type: "jobs:updated",
    updatedAt: new Date().toISOString(),
    ...(payload.groupId !== undefined && payload.groupId !== null ? { groupId: String(payload.groupId) } : {}),
    ...(payload.jobId !== undefined && payload.jobId !== null ? { jobId: String(payload.jobId) } : {}),
    ...(payload.updatedBy ? { updatedBy: String(payload.updatedBy).trim().toUpperCase() } : {}),
    ...(payload.source ? { source: payload.source } : {}),
  };

  sseEmitter.emit(JOBS_UPDATE_EVENT, event);
};
