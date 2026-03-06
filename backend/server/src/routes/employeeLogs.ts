import { Router } from "express";
import EmployeeLog from "../models/EmployeeLog";
import { authMiddleware } from "../middleware/auth";

const router = Router();

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

router.post("/programmer/start", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { refNumber } = req.body || {};

    const startedAt = new Date();
    const log = await EmployeeLog.create({
      role: "PROGRAMMER",
      activityType: "PROGRAMMER_JOB_CREATION",
      status: "IN_PROGRESS",
      userId: String(reqUser?.userId || ""),
      userEmail: String(reqUser?.email || ""),
      userName: String(reqUser?.fullName || "").trim(),
      refNumber: String(refNumber || ""),
      startedAt,
      workItemTitle: refNumber ? `New Job Draft #${refNumber}` : "New Job Draft",
      workSummary: "Programmer started creating a new job",
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error("Error creating programmer start log:", error);
    res.status(500).json({ message: "Error creating programmer start log" });
  }
});

router.post("/programmer/complete", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { logId, jobGroupId, refNumber, customer, description, settingsCount, quantityCount } = req.body || {};

    let log: any = null;

    if (logId) {
      log = await EmployeeLog.findOne({
        _id: logId,
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        userId: String(reqUser?.userId || ""),
      });
    }

    if (!log) {
      log = await EmployeeLog.findOne({
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        userId: String(reqUser?.userId || ""),
      }).sort({ startedAt: -1 });
    }

    if (!log) {
      const fallbackStartedAt = new Date();
      log = new EmployeeLog({
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        userId: String(reqUser?.userId || ""),
        userEmail: String(reqUser?.email || ""),
        userName: String(reqUser?.fullName || "").trim(),
        refNumber: String(refNumber || ""),
        startedAt: fallbackStartedAt,
      });
    }

    const endedAt = new Date();
    const startedAt = log.startedAt instanceof Date ? log.startedAt : endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    log.status = "COMPLETED";
    log.jobGroupId = Number(jobGroupId || log.jobGroupId || 0) || null;
    log.refNumber = String(refNumber || log.refNumber || "");
    log.jobCustomer = String(customer || "");
    log.jobDescription = String(description || "");
    log.workItemTitle = log.refNumber ? `Job #${log.refNumber}` : `Job #-`;
    log.workSummary = `Created ${Number(settingsCount || 0) || 1} setting(s)`;
    log.quantityCount = Number(quantityCount || 0) || null;
    log.endedAt = endedAt;
    log.durationSeconds = durationSeconds;
    log.metadata = {
      ...(log.metadata || {}),
      settingsCount: Number(settingsCount || 0) || 1,
    };

    await log.save();
    res.json(log);
  } catch (error: any) {
    console.error("Error completing programmer log:", error);
    res.status(500).json({ message: "Error completing programmer log" });
  }
});

router.post("/programmer/reject", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { logId } = req.body || {};

    let log: any = null;

    if (logId) {
      log = await EmployeeLog.findOne({
        _id: logId,
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        userId: String(reqUser?.userId || ""),
      });
    }

    if (!log) {
      log = await EmployeeLog.findOne({
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        userId: String(reqUser?.userId || ""),
      }).sort({ startedAt: -1 });
    }

    if (!log) {
      return res.status(404).json({ message: "No active programmer log found." });
    }

    const endedAt = new Date();
    const startedAt = log.startedAt instanceof Date ? log.startedAt : endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    log.status = "REJECTED";
    log.endedAt = endedAt;
    log.durationSeconds = durationSeconds;
    log.workSummary = "Draft discarded before save";
    log.metadata = {
      ...(log.metadata || {}),
      rejected: true,
    };

    await log.save();
    res.json(log);
  } catch (error: any) {
    console.error("Error rejecting programmer log:", error);
    res.status(500).json({ message: "Error rejecting programmer log" });
  }
});

router.post("/operator/complete", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const {
      jobId,
      jobGroupId,
      refNumber,
      customer,
      description,
      settingLabel,
      fromQty,
      toQty,
      quantityCount,
      startTime,
      endTime,
      machineNumber,
      opsName,
      machineHrs,
      idleTime,
      idleTimeDuration,
    } = req.body || {};

    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "startTime and endTime are required in DD/MM/YYYY HH:MM format" });
    }

    const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));

    const log = await EmployeeLog.create({
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "COMPLETED",
      userId: String(reqUser?.userId || ""),
      userEmail: String(reqUser?.email || ""),
      userName: String(reqUser?.fullName || "").trim(),
      jobId: String(jobId || ""),
      jobGroupId: Number(jobGroupId || 0) || null,
      refNumber: String(refNumber || ""),
      settingLabel: String(settingLabel || ""),
      quantityFrom: Number(fromQty || 0) || null,
      quantityTo: Number(toQty || 0) || null,
      quantityCount: Number(quantityCount || 0) || (Number(toQty || 0) && Number(fromQty || 0) ? Number(toQty) - Number(fromQty) + 1 : null),
      jobCustomer: String(customer || ""),
      jobDescription: String(description || ""),
      workItemTitle: `Job #${String(refNumber || "-")}`,
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
      },
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error("Error creating operator log:", error);
    res.status(500).json({ message: "Error creating operator log" });
  }
});

router.post("/operator/start", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const {
      jobId,
      jobGroupId,
      refNumber,
      customer,
      description,
      settingLabel,
      fromQty,
      toQty,
      quantityCount,
      startedAt,
    } = req.body || {};

    const parsedStartedAt = startedAt ? new Date(startedAt) : new Date();
    const safeStartedAt = Number.isNaN(parsedStartedAt.getTime()) ? new Date() : parsedStartedAt;

    const log = await EmployeeLog.create({
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "IN_PROGRESS",
      userId: String(reqUser?.userId || ""),
      userEmail: String(reqUser?.email || ""),
      userName: String(reqUser?.fullName || "").trim(),
      jobId: String(jobId || ""),
      jobGroupId: Number(jobGroupId || 0) || null,
      refNumber: String(refNumber || ""),
      settingLabel: String(settingLabel || ""),
      quantityFrom: Number(fromQty || 0) || null,
      quantityTo: Number(toQty || 0) || null,
      quantityCount:
        Number(quantityCount || 0) ||
        (Number(toQty || 0) && Number(fromQty || 0) ? Number(toQty) - Number(fromQty) + 1 : null),
      jobCustomer: String(customer || ""),
      jobDescription: String(description || ""),
      workItemTitle: `Job #${String(refNumber || "-")}`,
      workSummary: "Operator started production input",
      startedAt: safeStartedAt,
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error("Error creating operator start log:", error);
    res.status(500).json({ message: "Error creating operator start log" });
  }
});

router.post("/operator/task-switch", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const role = String(reqUser?.role || "").toUpperCase();
    if (role !== "OPERATOR" && role !== "ADMIN") {
      return res.status(403).json({ message: "Only operators and admins can create task switch logs." });
    }

    const { idleTime, remark, startedAt, endedAt, durationSeconds } = req.body || {};

    const reason = String(idleTime || "").trim();
    const note = String(remark || "").trim();
    if (!reason) {
      return res.status(400).json({ message: "Idle Time is required." });
    }
    if (!note) {
      return res.status(400).json({ message: "Remark is required." });
    }

    const parsedStart = startedAt ? new Date(startedAt) : new Date();
    const parsedEnd = endedAt ? new Date(endedAt) : new Date();
    const safeStart = Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart;
    const safeEnd = Number.isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;
    const computedDuration = Math.max(
      0,
      Number.isFinite(Number(durationSeconds))
        ? Math.floor(Number(durationSeconds))
        : Math.floor((safeEnd.getTime() - safeStart.getTime()) / 1000)
    );

    const log = await EmployeeLog.create({
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "COMPLETED",
      userId: String(reqUser?.userId || ""),
      userEmail: String(reqUser?.email || ""),
      userName: String(reqUser?.fullName || "").trim(),
      workItemTitle: "Operator Task Switch",
      workSummary: `Task switch idle: ${reason}`,
      startedAt: safeStart,
      endedAt: safeEnd,
      durationSeconds: computedDuration,
      metadata: {
        taskSwitch: true,
        idleTime: reason,
        remark: note,
      },
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error("Error creating operator task switch log:", error);
    res.status(500).json({ message: "Error creating operator task switch log" });
  }
});

router.get("/", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const reqRole = String(reqUser?.role || "").toUpperCase();
    if (reqRole !== "ADMIN" && reqRole !== "OPERATOR") {
      return res.status(403).json({ message: "Only operators and admins can view logs." });
    }

    const query: any = {};

    const role = String(req.query.role || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const search = String(req.query.search || "").trim();
    const machine = String(req.query.machine || "").trim();

    if (role && ["PROGRAMMER", "OPERATOR", "QC"].includes(role)) {
      query.role = role;
    }
    if (!query.role && reqRole === "OPERATOR") {
      query.role = "OPERATOR";
    }
    if (status && ["IN_PROGRESS", "COMPLETED", "REJECTED"].includes(status)) {
      query.status = status;
    }

    if (req.query.startDate || req.query.endDate) {
      query.startedAt = {};
      if (req.query.startDate) {
        const start = new Date(String(req.query.startDate));
        if (!Number.isNaN(start.getTime())) query.startedAt.$gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(String(req.query.endDate));
        if (!Number.isNaN(end.getTime())) query.startedAt.$lte = end;
      }
      if (Object.keys(query.startedAt).length === 0) {
        delete query.startedAt;
      }
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { workItemTitle: regex },
        { workSummary: regex },
        { jobCustomer: regex },
        { jobDescription: regex },
        { refNumber: regex },
      ];
    }

    if (machine) {
      const machineRegex = { $regex: machine, $options: "i" };
      query["$and"] = [
        ...(Array.isArray(query["$and"]) ? query["$and"] : []),
        {
          $or: [
            { "metadata.machineNumber": machineRegex },
            { workSummary: machineRegex },
          ],
        },
      ];
    }

    const logs = await EmployeeLog.find(query).sort({ startedAt: -1 }).limit(1000);
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching employee logs:", error);
    res.status(500).json({ message: "Error fetching employee logs" });
  }
});

export default router;
