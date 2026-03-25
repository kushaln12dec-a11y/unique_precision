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
  getUpdatedByName,
  operatorJobInclude,
  parseGroupIdOrNull,
  resolveCaptureRange,
} from "./operatorShared";

const router = Router();

router.use(authMiddleware);

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getQuantityNumbersFromLog = (log: {
  quantityFrom?: number | null;
  quantityTo?: number | null;
  quantityCount?: number | null;
  metadata?: any;
}): number[] => {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const fromMeta = Array.isArray(metadata.quantityNumbers)
    ? metadata.quantityNumbers
        .map((qty) => Number(qty))
        .filter((qty) => Number.isInteger(qty) && qty >= 1)
    : [];
  if (fromMeta.length > 0) return fromMeta;

  const from = Number(log.quantityFrom || 0);
  const to = Number(log.quantityTo || 0);
  if (from >= 1 && to >= from) {
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }

  const count = Number(log.quantityCount || 0);
  if (count >= 1) return Array.from({ length: count }, (_, index) => index + 1);
  return [];
};

const getRevenueByQuantityForLog = (log: {
  quantityFrom?: number | null;
  quantityTo?: number | null;
  quantityCount?: number | null;
  metadata?: any;
}): Map<number, number> => {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const quantities = getQuantityNumbersFromLog(log);
  const revenueByQty = new Map<number, number>();

  if (metadata.revenueByQuantity && typeof metadata.revenueByQuantity === "object") {
    Object.entries(metadata.revenueByQuantity).forEach(([qtyKey, amount]) => {
      const qty = Number(qtyKey);
      const value = toNumber(amount, 0);
      if (Number.isInteger(qty) && qty >= 1 && value > 0) {
        revenueByQty.set(qty, (revenueByQty.get(qty) || 0) + value);
      }
    });
    if (revenueByQty.size > 0) return revenueByQty;
  }

  const totalRevenue = toNumber(metadata.revenue, 0);
  if (totalRevenue <= 0 || quantities.length === 0) return revenueByQty;

  const perQuantity = totalRevenue / quantities.length;
  quantities.forEach((qty) => revenueByQty.set(qty, (revenueByQty.get(qty) || 0) + perQuantity));
  return revenueByQty;
};

const getAllocatedRevenueByQuantity = (
  logs: Array<{
    quantityFrom?: number | null;
    quantityTo?: number | null;
    quantityCount?: number | null;
    metadata?: any;
  }>,
  quantityNumbers: number[]
) => {
  const target = new Set(quantityNumbers);
  const allocated = new Map<number, number>();
  quantityNumbers.forEach((qty) => allocated.set(qty, 0));

  logs.forEach((log) => {
    const revenueByQty = getRevenueByQuantityForLog(log);
    revenueByQty.forEach((amount, qty) => {
      if (!target.has(qty)) return;
      allocated.set(qty, (allocated.get(qty) || 0) + amount);
    });
  });

  return allocated;
};

router.get("/jobs", async (req, res) => {
  try {
    const where: any = {};

    if (req.query.customer) {
      where.customer = { contains: String(req.query.customer), mode: "insensitive" };
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
    const { id, _id, operatorCaptures, quantityQaStates, qaStates, ...updateData } = req.body;

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
        parsedStart,
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
      });

      const metadata = (basePayload.metadata || {}) as Record<string, any>;
      const quantityNumbers = Array.isArray(metadata.quantityNumbers)
        ? metadata.quantityNumbers
            .map((qty) => Number(qty))
            .filter((qty) => Number.isInteger(qty) && qty >= 1)
        : Array.from({ length: quantityCount }, (_, index) => resolvedFromQty + index);
      const perQuantityRevenue = Math.max(0, toNumber(metadata.perQuantityRevenue, 0));
      const workedToEstimatedRatio = Math.max(0, toNumber(metadata.workedToEstimatedRatio, 0));
      const proposedRevenuePerQuantity = perQuantityRevenue * workedToEstimatedRatio;

      const priorLogs = await prisma.employeeLog.findMany({
        where: {
          jobId: String(refreshedJob.id),
          role: "OPERATOR",
          activityType: "OPERATOR_PRODUCTION",
          status: "COMPLETED",
          ...(existingLog ? { id: { not: existingLog.id } } : {}),
        },
        select: {
          quantityFrom: true,
          quantityTo: true,
          quantityCount: true,
          metadata: true,
        },
      });

      const allocatedByQuantity = getAllocatedRevenueByQuantity(priorLogs, quantityNumbers);
      const revenueByQuantity: Record<string, number> = {};
      let totalRevenue = 0;

      quantityNumbers.forEach((qty) => {
        const alreadyAllocated = Math.max(0, allocatedByQuantity.get(qty) || 0);
        const remaining = Math.max(0, perQuantityRevenue - alreadyAllocated);
        const qtyRevenue = Math.max(0, Math.min(remaining, proposedRevenuePerQuantity));
        const roundedQtyRevenue = Number(qtyRevenue.toFixed(2));
        revenueByQuantity[String(qty)] = roundedQtyRevenue;
        totalRevenue += roundedQtyRevenue;
      });

      const finalRevenue = Number(totalRevenue.toFixed(2));
      const finalPayload = {
        ...basePayload,
        metadata: {
          ...metadata,
          quantityNumbers,
          revenueByQuantity,
          revenue: finalRevenue,
          estimatedMinutes: Math.max(0, Math.round(toNumber(metadata.estimatedSeconds, 0) / 60)),
          overtimeMinutes: Math.max(0, Math.round(toNumber(metadata.overtimeSeconds, 0) / 60)),
          quantityRevenueModel: "WEDM_PROPORTIONAL",
        },
      };

      if (existingLog) {
        await prisma.employeeLog.update({
          where: { id: existingLog.id },
          data: finalPayload,
        });
      } else {
        await prisma.employeeLog.create({ data: finalPayload });
      }
    }

    res.json(mapJob(refreshedJob));
  } catch (error: any) {
    console.error("Error capturing operator input:", error);
    res.status(500).json({ message: "Error capturing operator input" });
  }
});

router.post("/jobs/:id/qa-status", async (req, res) => {
  try {
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
    const { jobIds, updateData } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ message: "jobIds array is required" });
    }

    const updatedAt = new Date();
    const updatedBy = getUpdatedByName(req);

    const { operatorCaptures, quantityQaStates, qaStates, ...safeUpdateData } = updateData || {};
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
