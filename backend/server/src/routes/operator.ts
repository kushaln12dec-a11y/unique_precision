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
  getOverlappingCaptureIds,
  getPagination,
  getUpdatedByName,
  hasCaptureRangeOverlap,
  operatorJobInclude,
  parseGroupIdOrNull,
  resolveCaptureRange,
} from "./operatorShared";

const router = Router();

router.use(authMiddleware);

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
      overwriteExisting,
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

    const existingCaptures = Array.isArray(job.operatorCaptures) ? [...job.operatorCaptures] : [];
    const hasOverlap = hasCaptureRangeOverlap(existingCaptures, resolvedFromQty, resolvedToQty);

    if (hasOverlap && !overwriteExisting) {
      return res.status(409).json({
        message: "Selected quantity range overlaps with an existing capture. Confirm overwrite to replace it.",
        code: "CAPTURE_RANGE_OVERLAP",
      });
    }

    const overlappingCaptureIds = getOverlappingCaptureIds(existingCaptures, resolvedFromQty, resolvedToQty);
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
      if (overlappingCaptureIds.length > 0) {
        await tx.jobOperatorCapture.deleteMany({
          where: { id: { in: overlappingCaptureIds } },
        });
      }

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

      if (existingLog) {
        await prisma.employeeLog.update({
          where: { id: existingLog.id },
          data: basePayload,
        });
      } else {
        await prisma.employeeLog.create({ data: basePayload });
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
