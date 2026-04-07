import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { parseOperatorDateTime } from "../utils/dateTime";
import { mapJob } from "../utils/prismaMappers";
import { resolveStoredFile } from "../utils/objectStorage";
import {
  buildCaptureEntry,
  buildOperatorLogPayload,
  createPaginatedResponse,
  getPagination,
  rebalanceOperatorRevenueForJob,
  getUpdatedByName,
  operatorJobInclude,
  parseGroupIdOrNull,
  resolveCaptureRange,
} from "./operatorShared";

const router = Router();

router.use(authMiddleware);

const getRequestRole = (req: any) => String(req?.user?.role || "").toUpperCase();

const canViewOperatorScreen = (req: any) =>
  ["ADMIN", "PROGRAMMER", "OPERATOR", "ACCOUNTANT"].includes(getRequestRole(req));

const canEditOperatorAssignments = (req: any) =>
  ["ADMIN", "PROGRAMMER", "OPERATOR"].includes(getRequestRole(req));

const canOperateOperatorInputs = (req: any) =>
  ["ADMIN", "OPERATOR"].includes(getRequestRole(req));

const getContiguousRanges = (quantityNumbers: number[]) => {
  const sorted = Array.from(
    new Set(
      quantityNumbers
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1)
    )
  ).sort((left, right) => left - right);
  if (sorted.length === 0) return [] as Array<{ fromQty: number; toQty: number; quantityCount: number }>;

  const ranges: Array<{ fromQty: number; toQty: number; quantityCount: number }> = [];
  let start = sorted[0] as number;
  let previous = sorted[0] as number;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index] as number;
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push({ fromQty: start, toQty: previous, quantityCount: previous - start + 1 });
    start = current;
    previous = current;
  }

  ranges.push({ fromQty: start, toQty: previous, quantityCount: previous - start + 1 });
  return ranges;
};

const getCaptureFragmentsWithoutQuantity = (capture: any, quantityNumber: number) => {
  const fromQty = Math.max(1, Number(capture?.fromQty || 1));
  const toQty = Math.max(fromQty, Number(capture?.toQty || fromQty));
  if (quantityNumber < fromQty || quantityNumber > toQty) return [];

  const remainingNumbers = Array.from({ length: toQty - fromQty + 1 }, (_, index) => fromQty + index).filter((qty) => qty !== quantityNumber);
  return getContiguousRanges(remainingNumbers).map((range) => ({
    captureMode: range.quantityCount > 1 ? "RANGE" : "SINGLE",
    fromQty: range.fromQty,
    toQty: range.toQty,
    quantityCount: range.quantityCount,
    startTime: capture?.startTime || "",
    endTime: capture?.endTime || "",
    machineHrs: capture?.machineHrs || "",
    machineNumber: capture?.machineNumber || "",
    opsName: capture?.opsName || "",
    idleTime: capture?.idleTime || "",
    idleTimeDuration: capture?.idleTimeDuration || "",
    lastImage: capture?.lastImage || null,
    createdAt: capture?.createdAt || "",
    createdBy: capture?.createdBy || "",
  }));
};

const getLogQuantityNumbers = (log: any) => {
  const metadata = (log?.metadata || {}) as Record<string, any>;
  const metadataQuantities = Array.isArray(metadata.quantityNumbers)
    ? metadata.quantityNumbers
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1)
    : [];
  if (metadataQuantities.length > 0) return metadataQuantities;

  const fromQty = Number(log?.quantityFrom || 0);
  const toQty = Number(log?.quantityTo || 0);
  if (fromQty >= 1 && toQty >= fromQty) {
    return Array.from({ length: toQty - fromQty + 1 }, (_, index) => fromQty + index);
  }

  const quantityCount = Number(log?.quantityCount || 0);
  if (quantityCount >= 1) {
    return Array.from({ length: quantityCount }, (_, index) => index + 1);
  }

  return [];
};

const buildLogFragmentsWithoutQuantity = (log: any, quantityNumber: number) => {
  const originalQuantities = getLogQuantityNumbers(log);
  if (!originalQuantities.includes(quantityNumber)) return [];

  const remainingNumbers = originalQuantities.filter((qty) => qty !== quantityNumber);
  const ranges = getContiguousRanges(remainingNumbers);
  const originalCount = Math.max(1, originalQuantities.length);
  const baseDurationSeconds = Math.max(0, Number(log?.durationSeconds || 0));
  const baseMetadata = ((log?.metadata || {}) as Record<string, any>) || {};
  const baseWorkedSeconds = Math.max(0, Number(baseMetadata.workedSeconds || baseDurationSeconds || 0));

  return ranges.map((range) => {
    const shareRatio = range.quantityCount / originalCount;
    return {
      role: String(log?.role || ""),
      activityType: String(log?.activityType || ""),
      status: String(log?.status || ""),
      userId: log?.userId || null,
      userEmail: log?.userEmail || "",
      userName: log?.userName || "",
      jobId: log?.jobId || null,
      jobGroupId: log?.jobGroupId ?? null,
      refNumber: log?.refNumber || "",
      settingLabel: log?.settingLabel || "",
      quantityFrom: range.fromQty,
      quantityTo: range.toQty,
      quantityCount: range.quantityCount,
      jobCustomer: log?.jobCustomer || "",
      jobDescription: log?.jobDescription || "",
      workItemTitle: log?.workItemTitle || "",
      workSummary: log?.workSummary || "",
      startedAt: log?.startedAt,
      endedAt: log?.endedAt,
      durationSeconds: Math.max(0, Math.round(baseDurationSeconds * shareRatio)),
      createdAt: log?.createdAt,
      metadata: {
        ...baseMetadata,
        quantityNumbers: Array.from({ length: range.quantityCount }, (_, index) => range.fromQty + index),
        workedSeconds: Math.max(0, Math.round(baseWorkedSeconds * shareRatio)),
      },
    };
  });
};

const getRequestedOperatorNames = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry && entry !== "UNASSIGN" && entry !== "UNASSIGNED");

const canOperatorAdjustOwnAssignment = (req: any, currentValue: unknown, requestedValue: unknown) => {
  const role = String(req?.user?.role || "").toUpperCase();
  if (role !== "OPERATOR") return true;

  const currentUserName = getUpdatedByName(req).trim().toUpperCase();
  if (!currentUserName) return false;

  const currentNames = getRequestedOperatorNames(currentValue);
  const requestedNames = getRequestedOperatorNames(requestedValue);
  const withoutSelf = (values: string[]) => values.filter((entry) => entry !== currentUserName).sort();

  return JSON.stringify(withoutSelf(currentNames)) === JSON.stringify(withoutSelf(requestedNames));
};

router.get("/jobs", async (req, res) => {
  try {
    if (!canViewOperatorScreen(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const where: any = {};
    const andConditions: any[] = [];
    const orConditions: any[] = [];

    const parseMultiValue = (value: unknown) =>
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (req.query.customer) {
      where.customer = { contains: String(req.query.customer), mode: "insensitive" };
    }
    if (req.query.createdBy) {
      const createdByValues = parseMultiValue(req.query.createdBy);
      if (createdByValues.length === 1) {
        where.createdBy = createdByValues[0];
      } else if (createdByValues.length > 1) {
        andConditions.push({
          OR: createdByValues.map((value) => ({ createdBy: value })),
        });
      }
    }
    if (req.query.assignedTo) {
      const assignedValues = parseMultiValue(req.query.assignedTo);
      const includeUnassigned = assignedValues.some((value) => /^unassign(?:ed)?$/i.test(value));
      const namedAssignments = assignedValues.filter((value) => !/^unassign(?:ed)?$/i.test(value));

      if (namedAssignments.length > 0) {
        orConditions.push(
          ...namedAssignments.map((value) => ({
            assignedTo: { contains: value, mode: "insensitive" },
          }))
        );
      }
      if (includeUnassigned) {
        orConditions.push({ assignedTo: "Unassign" }, { assignedTo: "Unassigned" });
      }
    }

    if (orConditions.length > 0) {
      andConditions.push({ OR: orConditions });
    }
    if (andConditions.length > 0) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...andConditions];
    }

    const { limit, offset } = getPagination(req);
    const [total, jobs] = await prisma.$transaction([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: operatorJobInclude,
      }),
    ]);
    res.json(createPaginatedResponse(jobs.map(mapJob), total, offset, limit));
  } catch (error: any) {
    console.error("Error fetching operator jobs:", error);
    res.status(500).json({ message: "Error fetching operator jobs" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    if (!canViewOperatorScreen(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: operatorJobInclude,
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(mapJob(job));
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching job" });
  }
});

router.get("/jobs/group/:groupId", async (req, res) => {
  try {
    if (!canViewOperatorScreen(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const groupId = parseGroupIdOrNull(req.params.groupId);
    if (groupId === null) {
      return res.status(400).json({ message: "Invalid groupId" });
    }
    const jobs = await prisma.job.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
      include: operatorJobInclude,
    });
    res.json(jobs.map(mapJob));
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

router.put("/jobs/:id", async (req, res) => {
  try {
    if (!canEditOperatorAssignments(req)) {
      return res.status(403).json({ message: "Only admins, programmers, and operators can update operator jobs." });
    }
    const { id, _id, operatorCaptures, quantityQaStates, qaStates, ...updateData } = req.body;
    const allowedFields = new Set(["assignedTo", "machineNumber", "startTime", "endTime", "machineHrs", "opsName", "idleTime", "idleTimeDuration", "lastImage", "updatedBy"]);
    const invalidField = Object.keys(updateData || {}).find((field) => !allowedFields.has(field));
    if (invalidField) {
      return res.status(400).json({ message: `Field ${invalidField} cannot be updated from the operator screen.` });
    }
    if (updateData.assignedTo !== undefined) {
      const existingJob = await prisma.job.findUnique({
        where: { id: req.params.id },
        select: { assignedTo: true },
      });
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (!canOperatorAdjustOwnAssignment(req, existingJob.assignedTo, updateData.assignedTo)) {
        return res.status(403).json({ message: "Operators can only add or remove their own name." });
      }
    }

    const updatedAt = new Date();
    const updatedBy = getUpdatedByName(req);

    if (updateData.lastImage !== undefined) {
      updateData.lastImage = await resolveStoredFile(updateData.lastImage, "jobs/last-images");
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        updatedAt,
        updatedBy: updatedBy || updateData.updatedBy || "",
      },
      include: operatorJobInclude,
    });

    res.json(mapJob(job));
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Job not found" });
    }
    console.error("Error updating operator job:", error);
    res.status(500).json({ message: "Error updating job" });
  }
});

router.post("/jobs/:id/capture-input", async (req, res) => {
  try {
    if (!canOperateOperatorInputs(req)) {
      return res.status(403).json({ message: "Only admins and operators can capture operator inputs." });
    }
    const {
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImage,
      quantityIndex,
      captureMode,
      fromQty,
      toQty,
      operatorLogId,
    } = req.body;
    const updatedAt = new Date();

    const lastImageUrl = await resolveStoredFile(lastImage, "jobs/last-images");

    const updateData: any = {
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImage: lastImageUrl,
      updatedAt,
    };

    const updatedBy = getUpdatedByName(req);
    if (updatedBy) updateData.updatedBy = updatedBy;

    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: operatorJobInclude,
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!canOperatorAdjustOwnAssignment(req, job.assignedTo, opsName)) {
      return res.status(403).json({ message: "Operators can only add or remove their own name." });
    }

    const totalQty = Math.max(1, Number((job as any).qty || 1));
    const { mode, resolvedFromQty, resolvedToQty, quantityCount } = resolveCaptureRange({
      totalQty,
      captureMode,
      quantityIndex,
      fromQty,
      toQty,
    });

    if (resolvedFromQty > totalQty || resolvedToQty < 1 || resolvedFromQty > resolvedToQty) {
      return res.status(400).json({ message: `Invalid quantity range. Allowed range is 1 to ${totalQty}.` });
    }

    const captureEntry = buildCaptureEntry({
      mode,
      resolvedFromQty,
      resolvedToQty,
      quantityCount,
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImageUrl,
      updatedBy: updateData.updatedBy || "",
    });

    await prisma.$transaction(async (tx) => {
      await tx.jobOperatorCapture.create({
        data: {
          ...captureEntry,
          jobId: job.id,
        },
      });

      for (let qty = resolvedFromQty; qty <= resolvedToQty; qty += 1) {
        await tx.jobQuantityQaState.upsert({
          where: { jobId_quantityNumber: { jobId: job.id, quantityNumber: qty } },
          update: { status: "SAVED" },
          create: { jobId: job.id, quantityNumber: qty, status: "SAVED" },
        });
      }

      await tx.job.update({
        where: { id: job.id },
        data: updateData,
      });
    });

    const refreshedJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: operatorJobInclude,
    });

    if (!refreshedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (parsedStart && parsedEnd) {
      const reqUser = req.user as any;
      const existingLog = operatorLogId
        ? await prisma.employeeLog.findFirst({
            where: {
              id: String(operatorLogId),
              role: "OPERATOR",
              activityType: "OPERATOR_PRODUCTION",
              status: "IN_PROGRESS",
            },
          })
        : null;

      const { payload: basePayload } = buildOperatorLogPayload({
        existingLogId: existingLog?.id,
        reqUser,
        refreshedJob,
        parsedStart: existingLog?.startedAt instanceof Date ? existingLog.startedAt : parsedStart,
        parsedEnd,
        mode,
        machineNumber,
        opsName,
        machineHrs,
        idleTime,
        idleTimeDuration,
        resolvedFromQty,
        resolvedToQty,
        quantityCount,
        captureEntry,
        forceDurationSeconds: Boolean(existingLog),
      });

      const finalPayload = {
        ...basePayload,
        metadata: {
          ...(basePayload.metadata || {}),
        },
      };

      await prisma.$transaction(async (tx) => {
        if (existingLog) {
          await tx.employeeLog.update({
            where: { id: existingLog.id },
            data: finalPayload,
          });
        } else {
          await tx.employeeLog.create({ data: finalPayload });
        }

        await rebalanceOperatorRevenueForJob(tx, refreshedJob);
      });
    }

    res.json(mapJob(refreshedJob));
  } catch (error: any) {
    console.error("Error capturing operator input:", error);
    res.status(500).json({ message: "Error capturing operator input" });
  }
});

router.post("/jobs/:id/reset-quantity", async (req, res) => {
  try {
    if (!canOperateOperatorInputs(req)) {
      return res.status(403).json({ message: "Only admins and operators can reset quantities." });
    }
    const quantityNumber = Number(req.body?.quantityNumber || 0);
    if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
      return res.status(400).json({ message: "quantityNumber must be a positive integer" });
    }

    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: operatorJobInclude,
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const operatorLogs = await prisma.employeeLog.findMany({
      where: {
        jobId: job.id,
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
      },
    });

    const updatedBy = getUpdatedByName(req);

    await prisma.$transaction(async (tx) => {
      const overlappingCaptures = (job.operatorCaptures || []).filter((capture: any) => {
        const fromQty = Math.max(1, Number(capture?.fromQty || 1));
        const toQty = Math.max(fromQty, Number(capture?.toQty || fromQty));
        return quantityNumber >= fromQty && quantityNumber <= toQty;
      });

      for (const capture of overlappingCaptures) {
        const fragments = getCaptureFragmentsWithoutQuantity(capture, quantityNumber);
        await tx.jobOperatorCapture.delete({ where: { id: String(capture.id) } });
        for (const fragment of fragments) {
          await tx.jobOperatorCapture.create({
            data: {
              ...fragment,
              jobId: job.id,
            },
          });
        }
      }

      await tx.jobQuantityQaState.deleteMany({
        where: {
          jobId: job.id,
          quantityNumber,
        },
      });

      const overlappingLogs = operatorLogs.filter((log: any) => getLogQuantityNumbers(log).includes(quantityNumber));
      for (const log of overlappingLogs) {
        const fragments = buildLogFragmentsWithoutQuantity(log, quantityNumber);
        await tx.employeeLog.delete({ where: { id: String(log.id) } });
        for (const fragment of fragments) {
          await tx.employeeLog.create({ data: fragment });
        }
      }

      const remainingCaptures = await tx.jobOperatorCapture.findMany({
        where: { jobId: job.id },
        orderBy: { createdAt: "asc" },
      });
      const latestCapture = remainingCaptures[remainingCaptures.length - 1];

      await tx.job.update({
        where: { id: job.id },
        data: {
          startTime: latestCapture?.startTime || "",
          endTime: latestCapture?.endTime || "",
          machineHrs: latestCapture?.machineHrs || "",
          machineNumber: latestCapture?.machineNumber || "",
          opsName: latestCapture?.opsName || "",
          idleTime: latestCapture?.idleTime || "",
          idleTimeDuration: latestCapture?.idleTimeDuration || "",
          lastImage: latestCapture?.lastImage || null,
          assignedTo: latestCapture?.opsName ? String(latestCapture.opsName) : "Unassign",
          updatedAt: new Date(),
          ...(updatedBy ? { updatedBy } : {}),
        },
      });

      const refreshedJobForRevenue = await tx.job.findUnique({
        where: { id: job.id },
        include: operatorJobInclude,
      });
      if (refreshedJobForRevenue) {
        await rebalanceOperatorRevenueForJob(tx, refreshedJobForRevenue);
      }
    });

    const refreshedJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: operatorJobInclude,
    });
    if (!refreshedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(mapJob(refreshedJob));
  } catch (error: any) {
    console.error("Error resetting operator quantity:", error);
    res.status(500).json({ message: "Error resetting operator quantity" });
  }
});

router.post("/jobs/:id/qa-status", async (req, res) => {
  try {
    if (!canOperateOperatorInputs(req)) {
      return res.status(403).json({ message: "Only admins and operators can update QA status." });
    }
    const { quantityNumbers, status } = req.body as {
      quantityNumbers?: number[];
      status?: "READY_FOR_QA" | "SENT_TO_QA";
    };

    if (!Array.isArray(quantityNumbers) || quantityNumbers.length === 0) {
      return res.status(400).json({ message: "quantityNumbers array is required" });
    }
    if (status !== "READY_FOR_QA" && status !== "SENT_TO_QA") {
      return res.status(400).json({ message: "status must be READY_FOR_QA or SENT_TO_QA" });
    }

    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { operatorCaptures: true, qaStates: true },
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const totalQty = Math.max(1, Number((job as any).qty || 1));
    const validQuantityNumbers = Array.from(new Set(
      quantityNumbers
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= totalQty)
    ));

    if (validQuantityNumbers.length === 0) {
      return res.status(400).json({ message: `No valid quantity numbers. Allowed range is 1 to ${totalQty}.` });
    }

    await prisma.$transaction(async (tx) => {
      for (const qty of validQuantityNumbers) {
        await tx.jobQuantityQaState.upsert({
          where: { jobId_quantityNumber: { jobId: job.id, quantityNumber: qty } },
          update: { status },
          create: { jobId: job.id, quantityNumber: qty, status },
        });
      }

      const updatedBy = getUpdatedByName(req);
      await tx.job.update({
        where: { id: job.id },
        data: {
          updatedAt: new Date(),
          ...(updatedBy ? { updatedBy } : {}),
        },
      });
    });

    const refreshedJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: { operatorCaptures: true, qaStates: true },
    });

    if (!refreshedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(mapJob(refreshedJob));
  } catch (error: any) {
    console.error("Error updating QA status:", error);
    res.status(500).json({ message: "Error updating QA status" });
  }
});

router.put("/jobs/bulk", async (req, res) => {
  try {
    if (!canEditOperatorAssignments(req)) {
      return res.status(403).json({ message: "Only admins, programmers, and operators can bulk update operator jobs." });
    }
    const { jobIds, updateData } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ message: "jobIds array is required" });
    }

    const updatedAt = new Date();
    const updatedBy = getUpdatedByName(req);

    const { operatorCaptures, quantityQaStates, qaStates, ...safeUpdateData } = updateData || {};
    const allowedBulkFields = new Set(["assignedTo", "machineNumber"]);
    const invalidField = Object.keys(safeUpdateData || {}).find((field) => !allowedBulkFields.has(field));
    if (invalidField) {
      return res.status(400).json({ message: `Field ${invalidField} cannot be bulk updated from the operator screen.` });
    }
    const finalUpdateData = {
      ...safeUpdateData,
      updatedAt,
      ...(updatedBy ? { updatedBy } : {}),
    };

    const result = await prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: finalUpdateData,
    });

    res.json({
      message: "Jobs updated successfully",
      modifiedCount: result.count,
    });
  } catch (error: any) {
    console.error("Error updating operator jobs:", error);
    res.status(500).json({ message: "Error updating jobs" });
  }
});

export default router;
