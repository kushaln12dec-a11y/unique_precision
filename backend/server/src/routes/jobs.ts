import { Router } from "express";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { parseDisplayDateTime } from "../utils/dateTime";
import { requireBigInt, toBigInt } from "../utils/bigint";
import { mapJob, mapJobList, mapOperatorJobList, mapQcJobList } from "../utils/prismaMappers";
import { resolveStoredFile } from "../utils/objectStorage";

const router = Router();

const JOB_REF_KEY = "jobRef";
const JOB_REF_REGEX = /^JOB-\d{5}$/;
const jobInclude: Prisma.JobInclude = {
  operatorCaptures: { orderBy: { createdAt: "asc" } },
  qaStates: true,
};

const programmerListSelect = {
  id: true,
  groupId: true,
  customer: true,
  rate: true,
  cut: true,
  thickness: true,
  passLevel: true,
  setting: true,
  qty: true,
  sedm: true,
  material: true,
  priority: true,
  description: true,
  programRefFile: true,
  operationRowsJson: true,
  critical: true,
  pipFinish: true,
  totalHrs: true,
  totalAmount: true,
  createdAt: true,
  createdBy: true,
  assignedTo: true,
  refNumber: true,
  updatedBy: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

const operatorListSelect = {
  ...programmerListSelect,
  machineNumber: true,
  qcDecision: true,
  qcReportClosed: true,
  qaStates: {
    select: {
      quantityNumber: true,
      status: true,
    },
  },
  operatorCaptures: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      machineNumber: true,
      createdAt: true,
    },
  },
} satisfies Prisma.JobSelect;

const qcListSelect = {
  id: true,
  groupId: true,
  customer: true,
  description: true,
  refNumber: true,
  programRefFile: true,
  qty: true,
  setting: true,
  cut: true,
  assignedTo: true,
  createdAt: true,
  qcDecision: true,
  qcReportClosed: true,
  priority: true,
  critical: true,
  qaStates: {
    select: {
      quantityNumber: true,
      status: true,
    },
  },
} satisfies Prisma.JobSelect;

const formatJobRef = (seq: number) => `JOB-${String(seq).padStart(5, "0")}`;

const getNextJobRef = async (): Promise<string> => {
  const counter = await prisma.counter.upsert({
    where: { key: JOB_REF_KEY },
    update: { seq: { increment: 1 } },
    create: { key: JOB_REF_KEY, seq: 1 },
  });
  return formatJobRef(Number(counter.seq || 1));
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toInt = (value: unknown): number | null => {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
};

const parseGroupIdParam = (value: unknown): bigint | null => {
  const parsed = toBigInt(value);
  return parsed ?? null;
};

const resolveReqUserName = (reqUser: any): string => {
  const fullName = String(reqUser?.fullName || "").trim();
  if (fullName) return fullName;
  const firstName = String(reqUser?.firstName || "").trim();
  const lastName = String(reqUser?.lastName || "").trim();
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined;
  const email = String(reqUser?.email || "").trim();
  return email.split("@")[0]?.trim() || "";
};

const normalizeJobInput = async (job: any) => {
  const createdAt = parseDisplayDateTime(job.createdAt) ?? new Date();
  const cutImage = Array.isArray(job.cutImage) ? (job.cutImage[0] || "") : job.cutImage;
  const cutImageUrl = await resolveStoredFile(cutImage, "jobs/cut-images");
  const lastImageUrl = await resolveStoredFile(job.lastImage, "jobs/last-images");
  const parsedUpdatedAt = job.updatedAt ? parseDisplayDateTime(job.updatedAt) : null;
  return {
    groupId: requireBigInt(job.groupId, "groupId"),
    customer: job.customer ?? "",
    rate: toNumber(job.rate),
    cut: toNumber(job.cut),
    thickness: toNumber(job.thickness),
    passLevel: job.passLevel !== undefined && job.passLevel !== null ? String(job.passLevel) : "1",
    setting: job.setting !== undefined && job.setting !== null ? String(job.setting) : "0",
    qty: toInt(job.qty) ?? 1,
    sedm: job.sedm ?? "No",
    sedmSelectionType: job.sedmSelectionType ?? "range",
    sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
    sedmStandardValue: job.sedmStandardValue ?? "",
    sedmLengthType: job.sedmLengthType ?? "min",
    sedmOver20Length: toNumber(job.sedmOver20Length),
    sedmLengthValue: toNumber(job.sedmLengthValue),
    sedmHoles: toInt(job.sedmHoles) ?? 1,
    sedmEntriesJson: job.sedmEntriesJson ?? "",
    operationRowsJson: job.operationRowsJson ?? "",
    material: job.material ?? "",
    priority: job.priority ?? "Low",
    description: job.description ?? "",
    programRefFile: job.programRefFile ?? "",
    cutImage: cutImageUrl ?? null,
    critical: Boolean(job.critical),
    pipFinish: Boolean(job.pipFinish),
    totalHrs: toNumber(job.totalHrs) ?? 0,
    totalAmount: toNumber(job.totalAmount) ?? 0,
    createdAt,
    createdBy: job.createdBy ?? "Unknown User",
    assignedTo: job.assignedTo ?? "Unassigned",
    refNumber: job.refNumber ?? "",
    startTime: job.startTime ?? "",
    endTime: job.endTime ?? "",
    machineHrs: job.machineHrs ?? "",
    machineNumber: job.machineNumber ?? "",
    opsName: job.opsName ?? "",
    idleTime: job.idleTime ?? "",
    idleTimeDuration: job.idleTimeDuration ?? "",
    lastImage: lastImageUrl ?? null,
    qcDecision: job.qcDecision ?? "PENDING",
    qcReportClosed: Boolean(job.qcReportClosed),
    updatedBy: job.updatedBy ?? "",
    ...(parsedUpdatedAt ? { updatedAt: parsedUpdatedAt } : {}),
  };
};

const normalizeJobUpdate = async (job: any) => {
  const data: any = {};
  if (job.groupId !== undefined) data.groupId = requireBigInt(job.groupId, "groupId");
  if (job.customer !== undefined) data.customer = job.customer ?? "";
  if (job.rate !== undefined) data.rate = toNumber(job.rate);
  if (job.cut !== undefined) data.cut = toNumber(job.cut);
  if (job.thickness !== undefined) data.thickness = toNumber(job.thickness);
  if (job.passLevel !== undefined) data.passLevel = job.passLevel !== null ? String(job.passLevel) : "";
  if (job.setting !== undefined) data.setting = job.setting !== null ? String(job.setting) : "";
  if (job.qty !== undefined) data.qty = toInt(job.qty);
  if (job.sedm !== undefined) data.sedm = job.sedm ?? "No";
  if (job.sedmSelectionType !== undefined) data.sedmSelectionType = job.sedmSelectionType ?? "range";
  if (job.sedmRangeKey !== undefined) data.sedmRangeKey = job.sedmRangeKey ?? "0.3-0.4";
  if (job.sedmStandardValue !== undefined) data.sedmStandardValue = job.sedmStandardValue ?? "";
  if (job.sedmLengthType !== undefined) data.sedmLengthType = job.sedmLengthType ?? "min";
  if (job.sedmOver20Length !== undefined) data.sedmOver20Length = toNumber(job.sedmOver20Length);
  if (job.sedmLengthValue !== undefined) data.sedmLengthValue = toNumber(job.sedmLengthValue);
  if (job.sedmHoles !== undefined) data.sedmHoles = toInt(job.sedmHoles);
  if (job.sedmEntriesJson !== undefined) data.sedmEntriesJson = job.sedmEntriesJson ?? "";
  if (job.operationRowsJson !== undefined) data.operationRowsJson = job.operationRowsJson ?? "";
  if (job.material !== undefined) data.material = job.material ?? "";
  if (job.priority !== undefined) data.priority = job.priority ?? "Low";
  if (job.description !== undefined) data.description = job.description ?? "";
  if (job.programRefFile !== undefined) data.programRefFile = job.programRefFile ?? "";
  if (job.cutImage !== undefined) {
    const cutImage = Array.isArray(job.cutImage) ? (job.cutImage[0] || "") : job.cutImage;
    data.cutImage = await resolveStoredFile(cutImage, "jobs/cut-images");
  }
  if (job.critical !== undefined) data.critical = Boolean(job.critical);
  if (job.pipFinish !== undefined) data.pipFinish = Boolean(job.pipFinish);
  if (job.totalHrs !== undefined) data.totalHrs = toNumber(job.totalHrs) ?? 0;
  if (job.totalAmount !== undefined) data.totalAmount = toNumber(job.totalAmount) ?? 0;
  if (job.createdAt !== undefined) data.createdAt = parseDisplayDateTime(job.createdAt) ?? new Date();
  if (job.createdBy !== undefined) data.createdBy = job.createdBy ?? "Unknown User";
  if (job.assignedTo !== undefined) data.assignedTo = job.assignedTo ?? "Unassigned";
  if (job.refNumber !== undefined) data.refNumber = job.refNumber ?? "";
  if (job.startTime !== undefined) data.startTime = job.startTime ?? "";
  if (job.endTime !== undefined) data.endTime = job.endTime ?? "";
  if (job.machineHrs !== undefined) data.machineHrs = job.machineHrs ?? "";
  if (job.machineNumber !== undefined) data.machineNumber = job.machineNumber ?? "";
  if (job.opsName !== undefined) data.opsName = job.opsName ?? "";
  if (job.idleTime !== undefined) data.idleTime = job.idleTime ?? "";
  if (job.idleTimeDuration !== undefined) data.idleTimeDuration = job.idleTimeDuration ?? "";
  if (job.lastImage !== undefined) {
    data.lastImage = await resolveStoredFile(job.lastImage, "jobs/last-images");
  }
  if (job.qcDecision !== undefined) data.qcDecision = job.qcDecision ?? "PENDING";
  if (job.qcReportClosed !== undefined) data.qcReportClosed = Boolean(job.qcReportClosed);
  if (job.updatedBy !== undefined) data.updatedBy = job.updatedBy ?? "";
  if (job.updatedAt !== undefined) data.updatedAt = parseDisplayDateTime(job.updatedAt) ?? new Date();
  return data;
};

const buildJobWhere = (req: any) => {
  const where: any = {};

  if (req.query.customer) {
    where.customer = { contains: String(req.query.customer), mode: "insensitive" };
  }
  if (req.query.description) {
    where.description = { contains: String(req.query.description), mode: "insensitive" };
  }
  if (req.query.createdBy) {
    where.createdBy = String(req.query.createdBy);
  }
  if (req.query.assignedTo) {
    const assignedTo = String(req.query.assignedTo).trim();
    if (/^unassign(?:ed)?$/i.test(assignedTo)) {
      where.OR = [{ assignedTo: "Unassign" }, { assignedTo: "Unassigned" }];
    } else {
      where.assignedTo = assignedTo;
    }
  }

  const numberRangeFields = ["cut", "thickness", "qty", "rate", "totalHrs", "totalAmount"];
  numberRangeFields.forEach((field) => {
    const minKey = `${field}_min`;
    const maxKey = `${field}_max`;
    if (req.query[minKey] !== undefined || req.query[maxKey] !== undefined) {
      const range: any = {};
      const minValue = toNumber(req.query[minKey]);
      const maxValue = toNumber(req.query[maxKey]);
      if (minValue !== null) range.gte = minValue;
      if (maxValue !== null) range.lte = maxValue;
      if (Object.keys(range).length > 0) {
        where[field] = range;
      }
    }
  });

  if (req.query.passLevel) {
    where.passLevel = String(req.query.passLevel);
  }
  if (req.query.setting) {
    where.setting = { contains: String(req.query.setting), mode: "insensitive" };
  }
  if (req.query.priority) {
    where.priority = String(req.query.priority);
  }
  if (req.query.critical !== undefined) {
    where.critical = req.query.critical === "true";
  }
  if (req.query.pipFinish !== undefined) {
    where.pipFinish = req.query.pipFinish === "true";
  }
  if (req.query.sedm) {
    where.sedm = String(req.query.sedm);
  }

  if (req.query.createdAt_min || req.query.createdAt_max) {
    const range: any = {};
    if (req.query.createdAt_min) {
      const start = new Date(String(req.query.createdAt_min));
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        range.gte = start;
      }
    }
    if (req.query.createdAt_max) {
      const end = new Date(String(req.query.createdAt_max));
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
    }
    if (Object.keys(range).length > 0) {
      where.createdAt = range;
    }
  }

  return where;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const parseNonNegativeInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized >= 0 ? normalized : fallback;
};

const getPagination = (req: any, defaultLimit = 15, maxLimit = 100) => {
  const limit = Math.min(parsePositiveInt(req.query.limit, defaultLimit), maxLimit);
  const offset = parseNonNegativeInt(req.query.offset, 0);
  return { limit, offset };
};

const createPaginatedResponse = <T,>(items: T[], total: number, offset: number, limit: number) => ({
  items,
  total,
  offset,
  limit,
  hasMore: offset + items.length < total,
});

const getPagedGroupIds = async (where: Prisma.JobWhereInput, offset: number, limit: number) => {
  const [allGroups, pagedGroups] = await Promise.all([
    prisma.job.groupBy({
      by: ["groupId"],
      where,
    }),
    prisma.job.groupBy({
      by: ["groupId"],
      where,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip: offset,
      take: limit,
    }),
  ]);
  return {
    totalGroups: allGroups.length,
    groupIds: pagedGroups.map((group) => group.groupId),
  };
};

// All routes require authentication
router.use(authMiddleware);

// Get all jobs with optional filters
router.get("/", async (req, res) => {
  try {
    const where = buildJobWhere(req);
    const { limit, offset } = getPagination(req);
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
    res.json(createPaginatedResponse(jobs.map(mapJob), total, offset, limit));
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

router.get("/programmer", async (req, res) => {
  try {
    const where = buildJobWhere(req);
    const { limit, offset } = getPagination(req);
    const { totalGroups, groupIds } = await getPagedGroupIds(where, offset, limit);
    const jobs = groupIds.length
      ? await prisma.job.findMany({
          where: { ...where, groupId: { in: groupIds } },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          select: programmerListSelect,
        })
      : [];

    const jobsByGroupId = new Map<string, any[]>();
    jobs.forEach((job) => {
      const key = String(job.groupId);
      if (!jobsByGroupId.has(key)) jobsByGroupId.set(key, []);
      jobsByGroupId.get(key)!.push(job);
    });

    const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);
    res.json(createPaginatedResponse(orderedJobs.map(mapJobList), totalGroups, offset, limit));
  } catch (error: any) {
    console.error("Error fetching programmer jobs:", error);
    res.status(500).json({ message: "Error fetching programmer jobs" });
  }
});

router.get("/operator", async (req, res) => {
  try {
    const where = buildJobWhere(req);
    const { limit, offset } = getPagination(req);
    const { totalGroups, groupIds } = await getPagedGroupIds(where, offset, limit);
    const jobs = groupIds.length
      ? await prisma.job.findMany({
          where: { ...where, groupId: { in: groupIds } },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          select: operatorListSelect,
        })
      : [];

    const jobsByGroupId = new Map<string, any[]>();
    jobs.forEach((job) => {
      const key = String(job.groupId);
      if (!jobsByGroupId.has(key)) jobsByGroupId.set(key, []);
      jobsByGroupId.get(key)!.push(job);
    });

    const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);
    res.json(createPaginatedResponse(orderedJobs.map(mapOperatorJobList), totalGroups, offset, limit));
  } catch (error: any) {
    console.error("Error fetching operator jobs:", error);
    res.status(500).json({ message: "Error fetching operator jobs" });
  }
});

router.get("/qc", async (req, res) => {
  try {
    const { limit, offset } = getPagination(req);
    const { totalGroups, groupIds } = await getPagedGroupIds({}, offset, limit);
    const jobs = groupIds.length
      ? await prisma.job.findMany({
          where: { groupId: { in: groupIds } },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          select: qcListSelect,
        })
      : [];

    const jobsByGroupId = new Map<string, any[]>();
    jobs.forEach((job) => {
      const key = String(job.groupId);
      if (!jobsByGroupId.has(key)) jobsByGroupId.set(key, []);
      jobsByGroupId.get(key)!.push(job);
    });

    const orderedJobs = groupIds.flatMap((groupId) => jobsByGroupId.get(String(groupId)) || []);
    res.json(createPaginatedResponse(orderedJobs.map(mapQcJobList), totalGroups, offset, limit));
  } catch (error: any) {
    console.error("Error fetching QC jobs:", error);
    res.status(500).json({ message: "Error fetching QC jobs" });
  }
});

// Get jobs by groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    const groupId = parseGroupIdParam(req.params.groupId);
    if (groupId === null) {
      return res.status(400).json({ message: "Invalid groupId" });
    }
    const jobs = await prisma.job.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
      include: jobInclude,
    });
    res.json(jobs.map(mapJob));
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs by groupId" });
  }
});

// Get single job
router.get("/:id", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: jobInclude,
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(mapJob(job));
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching job" });
  }
});

// Create job(s) - accepts single job or array of jobs
router.post("/", async (req, res) => {
  try {
    const jobsData = Array.isArray(req.body) ? req.body : [req.body];

    // Remove id field from each job
    const cleanedJobsData = jobsData.map((job: any) => {
      const { id, _id, ...jobWithoutId } = job;
      return jobWithoutId;
    });

    let refNumber = String(cleanedJobsData[0]?.refNumber || "").trim().toUpperCase();
    if (!JOB_REF_REGEX.test(refNumber)) {
      refNumber = await getNextJobRef();
    }

    const createdAtBase = Date.now();
    const normalizedJobsData = await Promise.all(
      cleanedJobsData.map(async (job: any, index: number) => ({
        ...(await normalizeJobInput({
          ...job,
          createdAt: job?.createdAt ?? new Date(createdAtBase + index * 1000).toISOString(),
        })),
        refNumber,
      }))
    );

    const createdJobs = await prisma.$transaction(
      normalizedJobsData.map((data) =>
        prisma.job.create({
          data,
          include: jobInclude,
        })
      )
    );

    const payload = createdJobs.map(mapJob);
    res.status(201).json(Array.isArray(req.body) ? payload : payload[0]);
  } catch (error: any) {
    console.error("Error creating job(s):", error);
    res.status(500).json({
      message: "Error creating job(s)",
      error: error.message || String(error),
    });
  }
});

// Update job
router.put("/:id", async (req, res) => {
  try {
    const { id, _id, operatorCaptures, quantityQaStates, qaStates, ...updateData } = req.body;
    const normalized = await normalizeJobUpdate(updateData);

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: normalized,
      include: jobInclude,
    });

    res.json(mapJob(job));
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Job not found" });
    }
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Error updating job" });
  }
});

// Update QC decision for all jobs in a group
router.put("/group/:groupId/qc-decision", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { decision } = req.body as { decision?: "APPROVED" | "REJECTED" | "PENDING" };
    if (!decision || !["APPROVED", "REJECTED", "PENDING"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision value" });
    }

    const groupId = parseGroupIdParam(req.params.groupId);
    if (groupId === null) {
      return res.status(400).json({ message: "Invalid groupId" });
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
      return res.status(404).json({ message: "No jobs found for group" });
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
          workSummary: decision === "REJECTED" ? "QC rejected job group" : decision === "APPROVED" ? "QC approved job group" : "QC decision reset to pending",
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

    return res.json(updatedJobs.map(mapJob));
  } catch (error: any) {
    console.error("Error updating QC decision:", error);
    return res.status(500).json({ message: "Error updating QC decision" });
  }
});

// Mark QC inspection report queue item as closed/open for all jobs in a group
router.put("/group/:groupId/qc-report-close", async (req, res) => {
  try {
    const { closed } = req.body as { closed?: boolean };
    const shouldClose = closed !== undefined ? Boolean(closed) : true;
    const groupId = parseGroupIdParam(req.params.groupId);
    if (groupId === null) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    const updateResult = await prisma.job.updateMany({
      where: { groupId },
      data: { qcReportClosed: shouldClose },
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ message: "No jobs found for group" });
    }

    const updatedJobs = await prisma.job.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
      include: jobInclude,
    });
    return res.json(updatedJobs.map(mapJob));
  } catch (error: any) {
    console.error("Error updating QC report closed state:", error);
    return res.status(500).json({ message: "Error updating QC report closed state" });
  }
});

// Delete job
router.delete("/:id", async (req, res) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(500).json({ message: "Error deleting job" });
  }
});

// Delete all jobs by groupId
router.delete("/group/:groupId", async (req, res) => {
  try {
    const groupId = parseGroupIdParam(req.params.groupId);
    if (groupId === null) {
      return res.status(400).json({ message: "Invalid groupId" });
    }
    const result = await prisma.job.deleteMany({ where: { groupId } });

    res.json({
      message: "Jobs deleted successfully",
      deletedCount: result.count,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting jobs" });
  }
});

export default router;
