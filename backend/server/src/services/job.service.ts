import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/httpError";
import { mapJob, mapJobList, mapOperatorJobList, mapQcJobList } from "../utils/prismaMappers";
import {
  buildJobWhere,
  createPaginatedResponse,
  getPagedGroupIds,
  getPagination,
  jobInclude,
  normalizeJobUpdate,
  operatorListSelect,
  parseGroupIdParam,
  programmerListSelect,
  qcListSelect,
  resolveReqUserName,
} from "../routes/jobsShared";
import { buildCreateJobsTransaction, groupJobsByGroupId } from "./job.service.helpers";
import { emitJobsUpdated } from "../lib/socket";

type JobsQuery = Record<string, unknown>;

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

const normalizeAssignedOperatorNames = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeOperatorName(entry))
    .filter((entry) => entry && entry !== "UNASSIGN" && entry !== "UNASSIGNED");

const buildAssignmentNotificationEntries = ({
  actorName,
  job,
  previousAssignedTo,
  nextAssignedTo,
}: {
  actorName: string;
  job: any;
  previousAssignedTo: unknown;
  nextAssignedTo: unknown;
}) => {
  const previous = new Set(normalizeAssignedOperatorNames(previousAssignedTo));
  const next = new Set(normalizeAssignedOperatorNames(nextAssignedTo));
  const added = Array.from(next).filter((name) => !previous.has(name));
  const removed = Array.from(previous).filter((name) => !next.has(name));
  const targetNames = [...added, ...removed];

  return targetNames.map((targetName) => {
    const eventType = added.includes(targetName) ? "ADDED" : "REMOVED";
    const refNumber = String(job?.refNumber || "").trim();
    const quantityText = Number(job?.qty || 0) > 1 ? `Qty 1-${Number(job.qty || 1)}` : "Qty 1";

    return {
      role: "OPERATOR",
      activityType: "OPERATOR_ASSIGNMENT",
      status: "COMPLETED",
      userEmail: "",
      userName: actorName,
      jobId: String(job?.id || ""),
      jobGroupId: job?.groupId ?? null,
      refNumber,
      settingLabel: String(job?.setting || ""),
      jobCustomer: String(job?.customer || ""),
      jobDescription: String(job?.description || ""),
      workItemTitle: refNumber ? `Assignment update for #${refNumber}` : "Assignment update",
      workSummary: `${actorName || "System"} ${eventType === "ADDED" ? "added" : "removed"} you on ${quantityText}.`,
      startedAt: new Date(),
      endedAt: new Date(),
      durationSeconds: 0,
      metadata: {
        targetUserName: targetName,
        actorName,
        eventType,
        assignedToBefore: Array.from(previous),
        assignedToAfter: Array.from(next),
        jobId: String(job?.id || ""),
        groupId: String(job?.groupId || ""),
        quantityLabel: quantityText,
      },
    };
  });
};

export const getJobs = async (query: JobsQuery) => {
  const where = buildJobWhere({ query });
  const { limit, offset } = getPagination({ query });

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: jobInclude,
    }),
  ]);

  return createPaginatedResponse(jobs.map(mapJob), total, offset, limit);
};

export const getProgrammerJobs = async (query: JobsQuery) => {
  const where = buildJobWhere({ query });
  const { limit, offset } = getPagination({ query });
  const { totalGroups, groupIds } = await getPagedGroupIds(where, offset, limit);

  const jobs = groupIds.length
    ? await prisma.job.findMany({
        where: { ...where, groupId: { in: groupIds } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: programmerListSelect,
      })
    : [];

  const jobsByGroupId = groupJobsByGroupId(jobs);
  const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);

  return createPaginatedResponse(orderedJobs.map(mapJobList), totalGroups, offset, limit);
};

export const getOperatorJobs = async (query: JobsQuery) => {
  const where = buildJobWhere({ query });
  const { limit, offset } = getPagination({ query });
  const { totalGroups, groupIds } = await getPagedGroupIds(where, offset, limit);

  const jobs = groupIds.length
    ? await prisma.job.findMany({
        where: { ...where, groupId: { in: groupIds } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: operatorListSelect,
      })
    : [];

  const jobsByGroupId = groupJobsByGroupId(jobs);
  const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);

  return createPaginatedResponse(orderedJobs.map(mapOperatorJobList), totalGroups, offset, limit);
};

export const getQcJobs = async (query: JobsQuery) => {
  const { limit, offset } = getPagination({ query });
  const { totalGroups, groupIds } = await getPagedGroupIds({}, offset, limit);

  const jobs = groupIds.length
    ? await prisma.job.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: qcListSelect,
      })
    : [];

  const jobsByGroupId = groupJobsByGroupId(jobs);
  const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);

  return createPaginatedResponse(orderedJobs.map(mapQcJobList), totalGroups, offset, limit);
};

export const getJobsByGroupId = async (groupIdParam: string) => {
  const groupId = parseGroupIdParam(groupIdParam);
  if (groupId === null) {
    throw new HttpError(400, "Invalid groupId");
  }

  const jobs = await prisma.job.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: jobInclude,
  });

  return jobs.map(mapJob);
};

export const getJobById = async (id: string) => {
  const job = await prisma.job.findUnique({
    where: { id },
    include: jobInclude,
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  return mapJob(job);
};

export const createJobs = async (payload: any[] | any, reqUser?: any) => {
  const jobCreateSpecs = await buildCreateJobsTransaction(payload);
  const createdJobs = await prisma.$transaction(jobCreateSpecs.map((spec) => prisma.job.create(spec)));

  const uniqueGroupIds = Array.from(new Set(createdJobs.map((job) => String(job.groupId))));
  emitJobsUpdated({
    ...(uniqueGroupIds.length === 1 ? { groupId: uniqueGroupIds[0] } : {}),
    updatedBy: resolveReqUserName(reqUser) || String((Array.isArray(payload) ? payload[0] : payload)?.createdBy || "").trim(),
    source: "programmer:create",
  });

  const result = createdJobs.map(mapJob);
  return Array.isArray(payload) ? result : result[0];
};

export const updateJob = async (id: string, body: any, reqUser?: any) => {
  const { id: _id, _id: _mongoId, operatorCaptures, quantityQaStates, qaStates, ...updateData } = body;
  const normalized = await normalizeJobUpdate(updateData);

  try {
    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: jobInclude,
    });

    if (!existingJob) {
      throw new HttpError(404, "Job not found");
    }

    const actorName = resolveReqUserName(reqUser) || normalizeOperatorName(normalized.updatedBy) || "SYSTEM";

    const job = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id },
        data: normalized,
        include: jobInclude,
      });

      if (normalized.assignedTo !== undefined) {
        const notificationEntries = buildAssignmentNotificationEntries({
          actorName,
          job: updatedJob,
          previousAssignedTo: existingJob.assignedTo,
          nextAssignedTo: normalized.assignedTo,
        });

        if (notificationEntries.length > 0) {
          await tx.employeeLog.createMany({ data: notificationEntries });
        }
      }

      return updatedJob;
    });

    emitJobsUpdated({
      groupId: job.groupId,
      jobId: job.id,
      updatedBy: actorName,
      source: "programmer:update",
    });

    return mapJob(job);
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new HttpError(404, "Job not found");
    }

    throw error;
  }
};

export const updateGroupQcDecision = async (
  groupIdParam: string,
  body: { decision?: "APPROVED" | "REJECTED" | "PENDING" },
  reqUser?: any
) => {
  const { decision } = body;
  if (!decision || !["APPROVED", "REJECTED", "PENDING"].includes(decision)) {
    throw new HttpError(400, "Invalid decision value");
  }

  const groupId = parseGroupIdParam(groupIdParam);
  if (groupId === null) {
    throw new HttpError(400, "Invalid groupId");
  }

  const updatedBy = resolveReqUserName(reqUser);
  const updateResult = await prisma.job.updateMany({
    where: { groupId },
    data: {
      qcDecision: decision,
      updatedBy: updatedBy || "",
      updatedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new HttpError(404, "No jobs found for group");
  }

  const updatedJobs = await prisma.job.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: jobInclude,
  });

  if (updatedJobs.length > 0) {
    const quantityCount = updatedJobs.reduce((sum, job) => sum + Math.max(0, Number(job.qty || 0)), 0);
    await prisma.employeeLog.create({
      data: {
        role: "QC",
        activityType: "QA_REVIEW",
        status: "COMPLETED",
        userId: String(reqUser?.userId || "") || null,
        userEmail: String(reqUser?.email || ""),
        userName: updatedBy,
        jobGroupId: groupId,
        refNumber: String(updatedJobs[0]?.refNumber || ""),
        jobCustomer: String(updatedJobs[0]?.customer || ""),
        jobDescription: String(updatedJobs[0]?.description || ""),
        workItemTitle: `QC ${decision === "APPROVED" ? "Approval" : decision === "REJECTED" ? "Rejection" : "Review"}`,
        workSummary:
          decision === "REJECTED"
            ? "QC rejected job group"
            : decision === "APPROVED"
              ? "QC approved job group"
              : "QC decision reset to pending",
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 0,
        quantityCount: quantityCount || null,
        metadata: {
          decision,
          groupId: String(groupId),
        },
      },
    });
  }

  emitJobsUpdated({
    groupId,
    updatedBy,
    source: "qc:decision",
  });

  return updatedJobs.map(mapJob);
};

export const updateGroupQcReportClosed = async (groupIdParam: string, body: { closed?: boolean }, reqUser?: any) => {
  const shouldClose = body.closed !== undefined ? Boolean(body.closed) : true;
  const groupId = parseGroupIdParam(groupIdParam);
  if (groupId === null) {
    throw new HttpError(400, "Invalid groupId");
  }

  const updateResult = await prisma.job.updateMany({
    where: { groupId },
    data: { qcReportClosed: shouldClose },
  });

  if (updateResult.count === 0) {
    throw new HttpError(404, "No jobs found for group");
  }

  const updatedJobs = await prisma.job.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    include: jobInclude,
  });

  emitJobsUpdated({
    groupId,
    updatedBy: resolveReqUserName(reqUser),
    source: "qc:report-close",
  });

  return updatedJobs.map(mapJob);
};

export const deleteJob = async (id: string, reqUser?: any) => {
  try {
    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { id: true, groupId: true },
    });

    if (!existingJob) {
      throw new HttpError(404, "Job not found");
    }

    await prisma.job.delete({ where: { id } });
    emitJobsUpdated({
      groupId: existingJob.groupId,
      jobId: existingJob.id,
      updatedBy: resolveReqUserName(reqUser),
      source: "programmer:delete",
    });
    return { message: "Job deleted successfully" };
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new HttpError(404, "Job not found");
    }

    throw error;
  }
};

export const deleteJobsByGroupId = async (groupIdParam: string, reqUser?: any) => {
  const groupId = parseGroupIdParam(groupIdParam);
  if (groupId === null) {
    throw new HttpError(400, "Invalid groupId");
  }

  const result = await prisma.job.deleteMany({ where: { groupId } });
  if (result.count > 0) {
    emitJobsUpdated({
      groupId,
      updatedBy: resolveReqUserName(reqUser),
      source: "programmer:delete-group",
    });
  }
  return {
    message: "Jobs deleted successfully",
    deletedCount: result.count,
  };
};
