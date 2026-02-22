import { Router } from "express";
import Job from "../models/Job";
import { authMiddleware } from "../middleware/auth";
import EmployeeLog from "../models/EmployeeLog";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const parseOperatorDateTime = (value?: string): Date | null => {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Get operator jobs with filters
router.get("/jobs", async (req, res) => {
  try {
    const query: any = {};

    // Filters
    if (req.query.customer) {
      query.customer = { $regex: req.query.customer, $options: "i" };
    }
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching operator jobs:", error);
    res.status(500).json({ message: "Error fetching operator jobs" });
  }
});

// Get single operator job
router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching job" });
  }
});

// Get jobs by groupId
router.get("/jobs/group/:groupId", async (req, res) => {
  try {
    const jobs = await Job.find({ groupId: Number(req.params.groupId) }).sort({ createdAt: 1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Update operator job fields
router.put("/jobs/:id", async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    updateData.updatedAt = updatedAt;
    if (req.user && (req.user as any).fullName) {
      updateData.updatedBy = (req.user as any).fullName;
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
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

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    const updateData: any = {
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImage,
      updatedAt
    };

    if (req.user && (req.user as any).fullName) {
      updateData.updatedBy = (req.user as any).fullName;
    }

    const job = await Job.findById(req.params.id);
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
    const existingCaptures = Array.isArray((job as any).operatorCaptures) ? [...(job as any).operatorCaptures] : [];
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

    const capturesWithoutOverlap = existingCaptures.filter((entry: any) => {
      const entryFrom = Number(entry.fromQty || 1);
      const entryTo = Number(entry.toQty || entryFrom);
      return !(resolvedFromQty <= entryTo && resolvedToQty >= entryFrom);
    });

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
      lastImage: lastImage || null,
      createdAt: updatedAt,
      createdBy: updateData.updatedBy || "",
    };

    const nextQaStates = new Map((job as any).quantityQaStates || []);
    for (let qty = resolvedFromQty; qty <= resolvedToQty; qty += 1) {
      nextQaStates.set(String(qty), "SAVED");
    }

    (job as any).operatorCaptures = [...capturesWithoutOverlap, captureEntry];
    (job as any).quantityQaStates = nextQaStates;
    Object.entries(updateData).forEach(([key, value]) => {
      (job as any)[key] = value;
    });
    await job.save();

    // Create operator productivity log when both timestamps exist
    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (parsedStart && parsedEnd) {
      const reqUser = req.user as any;
      const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
      const settingNumber = (() => {
        const foundIndex = Array.isArray((job as any).operatorCaptures)
          ? (job as any).operatorCaptures.findIndex((entry: any) => entry === captureEntry)
          : -1;
        return foundIndex >= 0 ? foundIndex + 1 : Number((job as any).setting || 0) || null;
      })();

      const existingLog = operatorLogId
        ? await EmployeeLog.findOne({
            _id: String(operatorLogId),
            role: "OPERATOR",
            activityType: "OPERATOR_PRODUCTION",
            status: "IN_PROGRESS",
          })
        : null;

      const basePayload: any = {
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
        status: "COMPLETED",
        userId: String(reqUser?.userId || ""),
        userEmail: String(reqUser?.email || ""),
        userName: String(reqUser?.fullName || "").trim(),
        jobId: String((job as any)._id || ""),
        jobGroupId: Number((job as any).groupId || 0) || null,
        refNumber: String((job as any).refNumber || ""),
        settingLabel: settingNumber ? String(settingNumber) : String((job as any).setting || ""),
        quantityFrom: resolvedFromQty,
        quantityTo: resolvedToQty,
        quantityCount: quantityCount,
        jobCustomer: String((job as any).customer || ""),
        jobDescription: String((job as any).description || ""),
        workItemTitle: `Job #${String((job as any).refNumber || "-")}`,
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
        existingLog.status = "COMPLETED";
        existingLog.userId = basePayload.userId;
        existingLog.userEmail = basePayload.userEmail;
        existingLog.userName = basePayload.userName;
        existingLog.jobId = basePayload.jobId;
        existingLog.jobGroupId = basePayload.jobGroupId;
        existingLog.refNumber = basePayload.refNumber;
        existingLog.settingLabel = basePayload.settingLabel;
        existingLog.quantityFrom = basePayload.quantityFrom;
        existingLog.quantityTo = basePayload.quantityTo;
        existingLog.quantityCount = basePayload.quantityCount;
        existingLog.jobCustomer = basePayload.jobCustomer;
        existingLog.jobDescription = basePayload.jobDescription;
        existingLog.workItemTitle = basePayload.workItemTitle;
        existingLog.workSummary = basePayload.workSummary;
        existingLog.endedAt = basePayload.endedAt;
        existingLog.durationSeconds = durationSeconds;
        existingLog.metadata = basePayload.metadata;
        await existingLog.save();
      } else {
        await EmployeeLog.create(basePayload);
      }
    }

    res.json(job);
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

    const job = await Job.findById(req.params.id);
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

    const qaStates = new Map((job as any).quantityQaStates || []);
    validQuantityNumbers.forEach((qty) => {
      qaStates.set(String(qty), status);
    });
    (job as any).quantityQaStates = qaStates;

    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    (job as any).updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;
    if (req.user && (req.user as any).fullName) {
      (job as any).updatedBy = (req.user as any).fullName;
    }

    await job.save();
    res.json(job);
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

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    const finalUpdateData = {
      ...updateData,
      updatedAt,
    };
    if (req.user && (req.user as any).fullName) {
      finalUpdateData.updatedBy = (req.user as any).fullName;
    }

    const result = await Job.updateMany(
      { _id: { $in: jobIds } },
      { $set: finalUpdateData }
    );

    res.json({
      message: "Jobs updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error("Error updating operator jobs:", error);
    res.status(500).json({ message: "Error updating jobs" });
  }
});

export default router;
