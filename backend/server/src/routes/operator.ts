import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { formatDbDateTime, parseOperatorDateTime } from "../utils/dateTime";
import { mapJob } from "../utils/prismaMappers";
import { resolveStoredFile } from "../utils/objectStorage";

const router = Router();
const jobInclude = { operatorCaptures: { orderBy: { createdAt: "asc" } }, qaStates: true };

router.use(authMiddleware);

const getUpdatedByName = (req: any): string => {
  if (req.user && (req.user as any).fullName) {
    return String((req.user as any).fullName);
  }
  return "";
};

const toUuid = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Get operator jobs with filters
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
      where.assignedTo = String(req.query.assignedTo);
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: jobInclude,
    });
    res.json(jobs.map(mapJob));
  } catch (error: any) {
    console.error("Error fetching operator jobs:", error);
    res.status(500).json({ message: "Error fetching operator jobs" });
  }
});

// Get single operator job
router.get("/jobs/:id", async (req, res) => {
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

// Get jobs by groupId
router.get("/jobs/group/:groupId", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { groupId: Number(req.params.groupId) },
      orderBy: { createdAt: "asc" },
      include: jobInclude,
    });
    res.json(jobs.map(mapJob));
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Update operator job fields
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
      include: jobInclude,
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

// Capture operator input (POST)
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
      include: jobInclude,
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const totalQty = Math.max(1, Number((job as any).qty || 1));
    const mode = captureMode === "RANGE" ? "RANGE" : "SINGLE";
    const fallbackFromQty = typeof quantityIndex === "number" ? quantityIndex + 1 : 1;
    const resolvedFromQty = Math.max(1, Number(fromQty || fallbackFromQty));
    const resolvedToQty =
      mode === "RANGE"
        ? Math.min(totalQty, Math.max(resolvedFromQty, Number(toQty || resolvedFromQty)))
        : Math.min(totalQty, resolvedFromQty);

    if (resolvedFromQty > totalQty || resolvedToQty < 1 || resolvedFromQty > resolvedToQty) {
      return res.status(400).json({ message: `Invalid quantity range. Allowed range is 1 to ${totalQty}.` });
    }

    const quantityCount = resolvedToQty - resolvedFromQty + 1;
    const existingCaptures = Array.isArray(job.operatorCaptures) ? [...job.operatorCaptures] : [];
    const hasOverlap = existingCaptures.some((entry: any) => {
      const entryFrom = Number(entry.fromQty || 1);
      const entryTo = Number(entry.toQty || entryFrom);
      return resolvedFromQty <= entryTo && resolvedToQty >= entryFrom;
    });

    if (hasOverlap && !overwriteExisting) {
      return res.status(409).json({
        message: "Selected quantity range overlaps with an existing capture. Confirm overwrite to replace it.",
        code: "CAPTURE_RANGE_OVERLAP",
      });
    }

    const overlappingCaptureIds = existingCaptures
      .filter((entry: any) => {
        const entryFrom = Number(entry.fromQty || 1);
        const entryTo = Number(entry.toQty || entryFrom);
        return resolvedFromQty <= entryTo && resolvedToQty >= entryFrom;
      })
      .map((entry: any) => entry.id);

    const captureEntry = {
      captureMode: mode,
      fromQty: resolvedFromQty,
      toQty: resolvedToQty,
      quantityCount,
      startTime: startTime || "",
      endTime: endTime || "",
      machineHrs: machineHrs || "",
      machineNumber: machineNumber || "",
      opsName: opsName || "",
      idleTime: idleTime || "",
      idleTimeDuration: idleTimeDuration || "",
      lastImage: lastImageUrl || null,
      createdAt: formatDbDateTime(),
      createdBy: updateData.updatedBy || "",
    };

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
      include: jobInclude,
    });

    if (!refreshedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Create operator productivity log when both timestamps exist
    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (parsedStart && parsedEnd) {
      const reqUser = req.user as any;
      const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
      const settingNumber = (() => {
        const foundIndex = Array.isArray(refreshedJob.operatorCaptures)
          ? refreshedJob.operatorCaptures.findIndex(
              (entry: any) => entry.fromQty === captureEntry.fromQty && entry.toQty === captureEntry.toQty
            )
          : -1;
        return foundIndex >= 0 ? foundIndex + 1 : toNumber((refreshedJob as any).setting) || null;
      })();

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

      const basePayload: any = {
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
        status: "COMPLETED",
        userId: toUuid(reqUser?.userId),
        userEmail: String(reqUser?.email || ""),
        userName: String(reqUser?.fullName || "").trim(),
        jobId: String(refreshedJob.id || ""),
        jobGroupId: Number(refreshedJob.groupId || 0) || null,
        refNumber: String(refreshedJob.refNumber || ""),
        settingLabel: settingNumber ? String(settingNumber) : String((refreshedJob as any).setting || ""),
        quantityFrom: resolvedFromQty,
        quantityTo: resolvedToQty,
        quantityCount: quantityCount,
        jobCustomer: String((refreshedJob as any).customer || ""),
        jobDescription: String((refreshedJob as any).description || ""),
        workItemTitle: `Job #${String((refreshedJob as any).refNumber || "-")}`,
        workSummary: `Machine ${machineNumber || "-"} | Ops ${opsName || "-"} | Hrs ${machineHrs || "-"}`,
        startedAt: parsedStart,
        endedAt: parsedEnd,
        durationSeconds,
        metadata: {
          machineNumber: String(machineNumber || ""),
          opsName: String(opsName || ""),
          machineHrs: String(machineHrs || ""),
          idleTime: String(idleTime || ""),
          idleTimeDuration: String(idleTimeDuration || ""),
          captureMode: mode,
        },
      };

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

// Update QA status for selected quantities in a job
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

// Update multiple jobs (for bulk operations)
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
