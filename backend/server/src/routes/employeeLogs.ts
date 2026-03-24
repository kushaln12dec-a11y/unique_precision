import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { parseOperatorDateTime } from "../utils/dateTime";
import { toBigInt } from "../utils/bigint";
import { mapEmployeeLog } from "../utils/prismaMappers";

const router = Router();

router.use(authMiddleware);

const toUuid = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
};

const withUserId = (userId?: string) => (userId ? { userId } : {});
const withJobId = (jobId?: string) => (jobId ? { jobId } : {});

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

router.post("/programmer/start", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { refNumber } = req.body || {};

    const startedAt = new Date();
    const userId = toUuid(reqUser?.userId);
    const log = await prisma.employeeLog.create({
      data: {
        role: "PROGRAMMER",
        activityType: "PROGRAMMER_JOB_CREATION",
        status: "IN_PROGRESS",
        ...withUserId(userId),
        userEmail: String(reqUser?.email || ""),
        userName: resolveReqUserName(reqUser),
        refNumber: String(refNumber || ""),
        startedAt,
        workItemTitle: refNumber ? `New Job Draft #${refNumber}` : "New Job Draft",
        workSummary: "Programmer started creating a new job",
      },
    });

    res.status(201).json(mapEmployeeLog(log));
  } catch (error: any) {
    console.error("Error creating programmer start log:", error);
    res.status(500).json({ message: "Error creating programmer start log" });
  }
});

router.post("/programmer/complete", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { logId, jobGroupId, refNumber, customer, description, settingsCount, quantityCount } = req.body || {};
    const userId = toUuid(reqUser?.userId);

    const matchingLog = logId
      ? await prisma.employeeLog.findFirst({
          where: {
            id: logId,
            role: "PROGRAMMER",
            activityType: "PROGRAMMER_JOB_CREATION",
            status: "IN_PROGRESS",
            ...withUserId(userId),
          },
        })
      : null;

    const latestInProgressLog = matchingLog
      ? null
      : await prisma.employeeLog.findFirst({
        where: {
          role: "PROGRAMMER",
          activityType: "PROGRAMMER_JOB_CREATION",
          status: "IN_PROGRESS",
          ...withUserId(userId),
        },
        orderBy: { startedAt: "desc" },
      });

    const endedAt = new Date();
    const existingLog = matchingLog || latestInProgressLog;
    const startedAt = existingLog?.startedAt instanceof Date ? existingLog.startedAt : endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    const resolvedGroupId = toBigInt(jobGroupId ?? existingLog?.jobGroupId) ?? null;
    let resolvedRefNumber = String(refNumber || existingLog?.refNumber || "");

    if (resolvedGroupId) {
      const groupJob = await prisma.job.findFirst({ where: { groupId: resolvedGroupId } });
      const jobRef = String(groupJob?.refNumber || "").trim();
      if (jobRef) {
        resolvedRefNumber = jobRef;
      }
    }

    const completeData = {
      role: "PROGRAMMER" as const,
      activityType: "PROGRAMMER_JOB_CREATION" as const,
      status: "COMPLETED" as const,
      ...withUserId(userId),
      userEmail: String(reqUser?.email || ""),
      userName: resolveReqUserName(reqUser),
      startedAt,
      jobGroupId: resolvedGroupId,
      refNumber: resolvedRefNumber,
      jobCustomer: String(customer || ""),
      jobDescription: String(description || ""),
      workItemTitle: resolvedRefNumber ? `Job # ${resolvedRefNumber}` : `Job # -`,
      workSummary: `Created ${Number(settingsCount || 0) || 1} setting(s)`,
      quantityCount: Number(quantityCount || 0) || null,
      endedAt,
      durationSeconds,
      metadata: {
        ...((existingLog?.metadata as any) || {}),
        settingsCount: Number(settingsCount || 0) || 1,
      },
    };

    const completedLog = existingLog
      ? await prisma.employeeLog.update({
          where: { id: existingLog.id },
          data: completeData,
        })
      : await prisma.employeeLog.create({
          data: completeData,
        });

    res.json(mapEmployeeLog(completedLog));
  } catch (error: any) {
    console.error("Error completing programmer log:", error);
    res.status(500).json({ message: "Error completing programmer log" });
  }
});

router.post("/programmer/reject", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const { logId } = req.body || {};
    const userId = toUuid(reqUser?.userId);

    let log = logId
      ? await prisma.employeeLog.findFirst({
          where: {
            id: logId,
            role: "PROGRAMMER",
            activityType: "PROGRAMMER_JOB_CREATION",
            status: "IN_PROGRESS",
            ...withUserId(userId),
          },
        })
      : null;

    if (!log) {
      log = await prisma.employeeLog.findFirst({
        where: {
          role: "PROGRAMMER",
          activityType: "PROGRAMMER_JOB_CREATION",
          status: "IN_PROGRESS",
          ...withUserId(userId),
        },
        orderBy: { startedAt: "desc" },
      });
    }

    if (!log) {
      return res.status(404).json({ message: "No active programmer log found." });
    }

    const endedAt = new Date();
    const startedAt = log.startedAt instanceof Date ? log.startedAt : endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));

    const updatedLog = await prisma.employeeLog.update({
      where: { id: log.id },
      data: {
        status: "REJECTED",
        endedAt,
        durationSeconds,
        workSummary: "Draft discarded before save",
        metadata: {
          ...((log.metadata as any) || {}),
          rejected: true,
        },
      },
    });

    res.json(mapEmployeeLog(updatedLog));
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

    const userId = toUuid(reqUser?.userId);
    const resolvedJobId = toUuid(jobId);

    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "startTime and endTime are required in DD/MM/YYYY HH:MM format" });
    }

    const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
    const resolvedGroupId = toBigInt(jobGroupId) ?? null;
    const groupJobs = resolvedGroupId
      ? await prisma.job.findMany({
          where: { groupId: resolvedGroupId },
          select: { totalHrs: true, rate: true },
        })
      : [];
    const groupWedmAmount = groupJobs.reduce(
      (sum, job) => sum + (Number(job.totalHrs || 0) * Number(job.rate || 0)),
      0
    );
    const currentJobRevenue = resolvedJobId
      ? await prisma.job.findUnique({
          where: { id: resolvedJobId },
          select: { totalHrs: true, rate: true },
        }).then((job) => Number(job?.totalHrs || 0) * Number(job?.rate || 0))
      : 0;

    const log = await prisma.employeeLog.create({
      data: {
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
        status: "COMPLETED",
        ...withUserId(userId),
        userEmail: String(reqUser?.email || ""),
        userName: resolveReqUserName(reqUser),
        ...withJobId(resolvedJobId),
        jobGroupId: resolvedGroupId,
        refNumber: String(refNumber || ""),
        settingLabel: String(settingLabel || ""),
        quantityFrom: Number(fromQty || 0) || null,
        quantityTo: Number(toQty || 0) || null,
        quantityCount:
          Number(quantityCount || 0) ||
          (Number(toQty || 0) && Number(fromQty || 0) ? Number(toQty) - Number(fromQty) + 1 : null),
        jobCustomer: String(customer || ""),
        jobDescription: String(description || ""),
        workItemTitle: `Job # ${String(refNumber || "-")}`,
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
          wedmAmount: groupWedmAmount,
          revenue: currentJobRevenue > 0 ? currentJobRevenue : undefined,
        },
      },
    });

    res.status(201).json(mapEmployeeLog(log));
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

    const userId = toUuid(reqUser?.userId);
    const resolvedJobId = toUuid(jobId);

    const parsedStartedAt = startedAt ? new Date(startedAt) : new Date();
    const safeStartedAt = Number.isNaN(parsedStartedAt.getTime()) ? new Date() : parsedStartedAt;

    const log = await prisma.employeeLog.create({
      data: {
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
        status: "IN_PROGRESS",
        ...withUserId(userId),
        userEmail: String(reqUser?.email || ""),
        userName: resolveReqUserName(reqUser),
        ...withJobId(resolvedJobId),
        jobGroupId: toBigInt(jobGroupId) ?? null,
        refNumber: String(refNumber || ""),
        settingLabel: String(settingLabel || ""),
        quantityFrom: Number(fromQty || 0) || null,
        quantityTo: Number(toQty || 0) || null,
        quantityCount:
          Number(quantityCount || 0) ||
          (Number(toQty || 0) && Number(fromQty || 0) ? Number(toQty) - Number(fromQty) + 1 : null),
        jobCustomer: String(customer || ""),
        jobDescription: String(description || ""),
        workItemTitle: `Job # ${String(refNumber || "-")}`,
        workSummary: "Operator started production input",
        startedAt: safeStartedAt,
      },
    });

    res.status(201).json(mapEmployeeLog(log));
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

    const log = await prisma.employeeLog.create({
      data: {
        role: "OPERATOR",
        activityType: "OPERATOR_PRODUCTION",
        status: "COMPLETED",
        ...withUserId(toUuid(reqUser?.userId)),
        userEmail: String(reqUser?.email || ""),
        userName: resolveReqUserName(reqUser),
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
      },
    });

    res.status(201).json(mapEmployeeLog(log));
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

    const where: any = {};

    const role = String(req.query.role || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const search = String(req.query.search || "").trim();
    const machine = String(req.query.machine || "").trim();

    if (role && ["PROGRAMMER", "OPERATOR", "QC"].includes(role)) {
      where.role = role;
    }
    if (!where.role && reqRole === "OPERATOR") {
      where.role = "OPERATOR";
    }
    if (status && ["IN_PROGRESS", "COMPLETED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    if (req.query.startDate || req.query.endDate) {
      const range: any = {};
      if (req.query.startDate) {
        const start = new Date(String(req.query.startDate));
        if (!Number.isNaN(start.getTime())) range.gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(String(req.query.endDate));
        if (!Number.isNaN(end.getTime())) range.lte = end;
      }
      if (Object.keys(range).length > 0) {
        where.startedAt = range;
      }
    }

    if (search) {
      where.OR = [
        { userName: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
        { workItemTitle: { contains: search, mode: "insensitive" } },
        { workSummary: { contains: search, mode: "insensitive" } },
        { jobCustomer: { contains: search, mode: "insensitive" } },
        { jobDescription: { contains: search, mode: "insensitive" } },
        { refNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (machine) {
      const machineSearch = { contains: machine, mode: "insensitive" };
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { workSummary: machineSearch },
          ],
        },
      ];
    }

    const { limit, offset } = getPagination(req);
    const [total, logs] = await prisma.$transaction([
      prisma.employeeLog.count({ where }),
      prisma.employeeLog.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);
    res.json(createPaginatedResponse(logs.map(mapEmployeeLog), total, offset, limit));
  } catch (error: any) {
    console.error("Error fetching employee logs:", error);
    res.status(500).json({ message: "Error fetching employee logs" });
  }
});

export default router;
