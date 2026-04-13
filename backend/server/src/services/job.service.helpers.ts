import { calculateJob } from "./jobCalculation.service";
import {
  JOB_REF_REGEX,
  getNextJobRef,
  jobInclude,
  normalizeJobInput,
} from "../routes/jobsShared";

export const groupJobsByGroupId = <T extends { groupId: unknown }>(jobs: T[]) => {
  const jobsByGroupId = new Map<string, T[]>();

  jobs.forEach((job) => {
    const key = String(job.groupId);
    if (!jobsByGroupId.has(key)) jobsByGroupId.set(key, []);
    jobsByGroupId.get(key)!.push(job);
  });

  return jobsByGroupId;
};

export const buildCreateJobsTransaction = async (payload: any[] | any) => {
  const jobsData = Array.isArray(payload) ? payload : [payload];
  const cleanedJobsData = jobsData.map((job: any) => {
    const { id, _id, ...jobWithoutIds } = job;
    return jobWithoutIds;
  });

  let refNumber = String(cleanedJobsData[0]?.refNumber || "").trim().toUpperCase();
  if (!JOB_REF_REGEX.test(refNumber)) {
    refNumber = await getNextJobRef();
  }

  const createdAtBase = Date.now();
  const normalizedJobsData = await Promise.all(
    cleanedJobsData.map(async (job: any, index: number) => {
      const calculated = calculateJob(job);
      return normalizeJobInput({
        ...job,
        totalHrs: job?.totalHrs ?? calculated.totalHrs,
        totalAmount: job?.totalAmount ?? calculated.totalAmount,
        createdAt: job?.createdAt ?? new Date(createdAtBase + index * 1000).toISOString(),
        refNumber,
      });
    }),
  );

  return normalizedJobsData.map((data) => ({
    data,
    include: jobInclude,
  }));
};
