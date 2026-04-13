import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { parseOperatorDateTime } from "../utils/dateTime";
import { toBigInt } from "../utils/bigint";
import { mapEmployeeLog } from "../utils/prismaMappers";
import { rebalanceOperatorRevenueForJob } from "./operatorShared";

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
  if (fullName) return fullName.toUpperCase();
  const firstName = String(reqUser?.firstName || "").trim();
  const lastName = String(reqUser?.lastName || "").trim();
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined.toUpperCase();
  const email = String(reqUser?.email || "").trim();
  return (email.split("@")[0]?.trim() || "").toUpperCase();
};

const getRequestedOperatorNames = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry && entry !== "UNASSIGN" && entry !== "UNASSIGNED");

const canOperatorAdjustOwnAssignment = (reqUser: any, currentValue: unknown, requestedValue: unknown) => {
  return true;
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

const parseMachineHoursToSeconds = (value: unknown): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.includes(":")) {
    const [hoursRaw, minutesRaw] = raw.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return Math.max(0, Math.round((hours * 60 + minutes) * 60));
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 3600);
};

const getWorkedSecondsForOperatorLog = (log: any): number => {
  const metadata = (log?.metadata || {}) as Record<string, any>;
  const fromMachineHours = parseMachineHoursToSeconds(metadata.machineHrs);
  if (fromMachineHours !== null && fromMachineHours > 0) return fromMachineHours;
  return Math.max(0, Number(log?.durationSeconds || 0));
};

const getQuantityNumbersFromLog = (log: {
  quantityFrom?: number | null;
  quantityTo?: number | null;
  quantityCount?: number | null;
  metadata?: any;
}): number[] => {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const fromMeta = Array.isArray(metadata.quantityNumbers)
    ? metadata.quantityNumbers.map((qty) => Number(qty)).filter((qty) => Number.isInteger(qty) && qty >= 1)
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

const getOperatorRevenueValue = (log: any): number | null => {
  const metadata = (log?.metadata || {}) as Record<string, any>;
  const explicitRevenue = log?.revenue ?? metadata.revenue;
  const numericRevenue = Number(explicitRevenue);
  return Number.isFinite(numericRevenue) ? numericRevenue : null;
};

const normalizeMachineNumber = (value: unknown): string => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  const mcMatch = raw.match(/^MC-?0*([1-9]\d*)$/);
  if (mcMatch?.[1]) return mcMatch[1];
  const mMatch = raw.match(/^M0*([1-9]\d*)$/);
  if (mMatch?.[1]) return mMatch[1];
  const plainMatch = raw.match(/^0*([1-9]\d*)$/);
  if (plainMatch?.[1]) return plainMatch[1];
  return raw;
};

const getMachineNumberFromOperatorLog = (log: any): string => {
  const metadata = (log?.metadata || {}) as Record<string, any>;
  return normalizeMachineNumber(metadata.machineNumber);
};

const findActiveMachineConflict = async (
  machineNumber: unknown,
  options: { excludeLogId?: string } = {}
) => {
  const normalizedMachineNumber = normalizeMachineNumber(machineNumber);
  if (!normalizedMachineNumber) return null;

  const activeLogs = await prisma.employeeLog.findMany({
    where: {
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "IN_PROGRESS",
    },
    select: {
      id: true,
      jobId: true,
      refNumber: true,
      settingLabel: true,
      userName: true,
      endedAt: true,
      metadata: true,
    },
  });

  return (
    activeLogs.find((log) => {
      if (options.excludeLogId && String(log.id) === String(options.excludeLogId)) return false;
      if (log.endedAt) return false;
      return getMachineNumberFromOperatorLog(log) === normalizedMachineNumber;
    }) || null
  );
};

const findActiveQuantityConflict = async (
  jobId: unknown,
  fromQty: unknown,
  toQty: unknown,
  options: { excludeLogId?: string } = {}
) => {
  const normalizedJobId = String(jobId || "").trim();
  const rangeStart = Math.max(1, Number(fromQty || 1));
  const rangeEnd = Math.max(rangeStart, Number(toQty || rangeStart));
  if (!normalizedJobId) return null;

  const activeLogs = await prisma.employeeLog.findMany({
    where: {
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "IN_PROGRESS",
      jobId: normalizedJobId,
    },
    select: {
      id: true,
      userName: true,
      refNumber: true,
      quantityFrom: true,
      quantityTo: true,
      quantityCount: true,
      metadata: true,
      endedAt: true,
    },
  });

  return (
    activeLogs.find((log) => {
      if (options.excludeLogId && String(log.id) === String(options.excludeLogId)) return false;
      if (log.endedAt) return false;
      const logFrom = Math.max(1, Number(log.quantityFrom || 1));
      const logTo = Math.max(logFrom, Number(log.quantityTo || logFrom));
      return rangeStart <= logTo && rangeEnd >= logFrom;
    }) || null
  );
};

const buildOperatorLogCompletionKey = (log: any): string[] => {
  const jobId = String(log?.jobId || "").trim();
  const quantityNumbers = getQuantityNumbersFromLog(log);
  if (!jobId || quantityNumbers.length === 0) return [];
  return quantityNumbers.map((qty) => `${jobId}:${qty}`);
};

const parseFlexibleDate = (value: unknown): Date | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  return parseOperatorDateTime(raw);
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
      const value = Number(amount);
      if (Number.isInteger(qty) && qty >= 1 && Number.isFinite(value) && value > 0) {
        revenueByQty.set(qty, (revenueByQty.get(qty) || 0) + value);
      }
    });
    if (revenueByQty.size > 0) return revenueByQty;
  }

  const totalRevenue = Number(metadata.revenue || 0);
  if (!Number.isFinite(totalRevenue) || totalRevenue <= 0 || quantities.length === 0) return revenueByQty;

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
      workItemTitle: resolvedRefNumber ? `Job #${resolvedRefNumber}` : "Job #-",
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
      logId,
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
      status,
    } = req.body || {};

    const userId = toUuid(reqUser?.userId);
    const resolvedJobId = toUuid(jobId);
    const normalizedStatus = String(status || "COMPLETED").toUpperCase() === "REJECTED" ? "REJECTED" : "COMPLETED";
    const existingLog = logId
      ? await prisma.employeeLog.findFirst({
          where: {
            id: String(logId),
            role: "OPERATOR",
            activityType: "OPERATOR_PRODUCTION",
            status: "IN_PROGRESS",
          },
        })
      : null;

    if (existingLog) {
      const parsedEnd = parseFlexibleDate(endTime || req.body?.endedAt) || new Date();
      const parsedStart = existingLog.startedAt instanceof Date ? existingLog.startedAt : parseFlexibleDate(startTime) || parsedEnd;
      const workedSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
      const quantityNumbers = getQuantityNumbersFromLog(existingLog);
      const resolvedExistingJobId = String(existingLog.jobId || "").trim();
      const relatedJob = resolvedExistingJobId
        ? await prisma.job.findUnique({
            where: { id: resolvedExistingJobId },
            select: {
              id: true,
              groupId: true,
              qty: true,
              totalHrs: true,
              rate: true,
              refNumber: true,
              customer: true,
              description: true,
              setting: true,
              assignedTo: true,
            },
          })
        : null;

      if (relatedJob && !canOperatorAdjustOwnAssignment(reqUser, relatedJob.assignedTo, opsName || (existingLog.metadata as any)?.opsName)) {
        return res.status(403).json({ message: "Operators can only add or remove their own name." });
      }

      const updatedLog = await prisma.$transaction(async (tx) => {
        const nextLog = await tx.employeeLog.update({
          where: { id: existingLog.id },
          data: {
            status: normalizedStatus,
            startedAt: parsedStart,
            endedAt: parsedEnd,
            durationSeconds: workedSeconds,
            refNumber: String(refNumber || existingLog.refNumber || relatedJob?.refNumber || ""),
            settingLabel: String(settingLabel || existingLog.settingLabel || relatedJob?.setting || ""),
            quantityFrom: existingLog.quantityFrom,
            quantityTo: existingLog.quantityTo,
            quantityCount: existingLog.quantityCount,
            jobCustomer: String(customer || existingLog.jobCustomer || relatedJob?.customer || ""),
            jobDescription: String(description || existingLog.jobDescription || relatedJob?.description || ""),
            workItemTitle: `Job #${String(refNumber || existingLog.refNumber || relatedJob?.refNumber || "-")}`,
            workSummary: `Machine ${machineNumber || (existingLog.metadata as any)?.machineNumber || "-"} | Ops ${opsName || (existingLog.metadata as any)?.opsName || existingLog.userName || "-"} | Hrs ${machineHrs || "-"}`,
            metadata: {
              ...((existingLog.metadata as any) || {}),
              machineNumber: String(machineNumber || (existingLog.metadata as any)?.machineNumber || ""),
              opsName: String(opsName || (existingLog.metadata as any)?.opsName || existingLog.userName || ""),
              machineHrs: String(machineHrs || ""),
              idleTime: String(idleTime || "Shift Over"),
              idleTimeDuration: String(idleTimeDuration || ""),
              quantityNumbers,
              workedSeconds,
            },
          },
        });

        if (relatedJob?.id) {
          await rebalanceOperatorRevenueForJob(tx, relatedJob);
        }

        return nextLog;
      });

      return res.status(201).json(mapEmployeeLog(updatedLog));
    }

    const parsedStart = parseOperatorDateTime(startTime);
    const parsedEnd = parseOperatorDateTime(endTime);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "startTime and endTime are required in DD/MM/YYYY HH:MM format" });
    }

    const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
    const resolvedGroupId = toBigInt(jobGroupId) ?? null;
    if (resolvedJobId) {
      const relatedJob = await prisma.job.findUnique({
        where: { id: resolvedJobId },
        select: { assignedTo: true },
      });
      if (relatedJob && !canOperatorAdjustOwnAssignment(reqUser, relatedJob.assignedTo, opsName)) {
        return res.status(403).json({ message: "Operators can only add or remove their own name." });
      }
    }
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

    const log = await prisma.$transaction(async (tx) => {
      const createdLog = await tx.employeeLog.create({
        data: {
          role: "OPERATOR",
          activityType: "OPERATOR_PRODUCTION",
          status: normalizedStatus,
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
            wedmAmount: groupWedmAmount,
            revenue: currentJobRevenue > 0 ? currentJobRevenue : undefined,
          },
        },
      });

      if (resolvedJobId) {
        const relatedJob = await tx.job.findUnique({
          where: { id: resolvedJobId },
          select: { id: true, qty: true, totalHrs: true, rate: true },
        });
        if (relatedJob) {
          await rebalanceOperatorRevenueForJob(tx, relatedJob);
        }
      }

      return createdLog;
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
      machineNumber,
      opsName,
    } = req.body || {};

    const userId = toUuid(reqUser?.userId);
    const resolvedJobId = toUuid(jobId);
    const normalizedMachineNumber = normalizeMachineNumber(machineNumber);
    const resolvedFromQty = Math.max(1, Number(fromQty || 1));
    const resolvedToQty = Math.max(resolvedFromQty, Number(toQty || resolvedFromQty));

    if (resolvedJobId) {
      const quantityConflict = await findActiveQuantityConflict(resolvedJobId, resolvedFromQty, resolvedToQty);
      if (quantityConflict) {
        const conflictFromQty = Math.max(1, Number(quantityConflict.quantityFrom || 1));
        const conflictToQty = Math.max(conflictFromQty, Number(quantityConflict.quantityTo || conflictFromQty));
        return res.status(409).json({
          message: `Qty ${conflictFromQty === conflictToQty ? conflictFromQty : `${conflictFromQty}-${conflictToQty}`} is already being worked on by ${String(quantityConflict.userName || "another operator")}.`,
        });
      }
    }

    if (normalizedMachineNumber) {
      const conflict = await findActiveMachineConflict(normalizedMachineNumber);
      if (conflict) {
        return res.status(409).json({
          message: `Machine M${normalizedMachineNumber} is already running for ${String(conflict.refNumber || "another job")} (${String(conflict.userName || "operator")}).`,
        });
      }
    }

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
        workItemTitle: `Job #${String(refNumber || "-")}`,
        workSummary: `Machine ${normalizedMachineNumber ? `M${normalizedMachineNumber}` : "-"} | Ops ${String(opsName || resolveReqUserName(reqUser) || "-")} | Running`,
        startedAt: safeStartedAt,
        metadata: {
          machineNumber: normalizedMachineNumber,
          opsName: String(opsName || resolveReqUserName(reqUser) || ""),
        },
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
    if (!["ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR"].includes(reqRole)) {
      return res.status(403).json({ message: "Only operators, programmers, accountants, and admins can view logs." });
    }

    const where: any = {};

    const role = String(req.query.role || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toUpperCase();
    const activityType = String(req.query.activityType || "").trim().toUpperCase();
    const search = String(req.query.search || "").trim();
    const machine = String(req.query.machine || "").trim();

    if (role && ["PROGRAMMER", "OPERATOR", "QC"].includes(role)) {
      where.role = role;
    }
    if (!where.role && reqRole === "OPERATOR") {
      where.role = "OPERATOR";
    }
    if (activityType) {
      where.activityType = activityType;
    } else if (String(where.role || "").toUpperCase() === "OPERATOR") {
      where.activityType = "OPERATOR_PRODUCTION";
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

    const mappedLogs = logs.map(mapEmployeeLog);
    const operatorGroupIds = Array.from(
      new Set(
        mappedLogs
          .filter((log: any) => String(log.role || "").toUpperCase() === "OPERATOR" && log.jobGroupId !== null && log.jobGroupId !== undefined)
          .map((log: any) => String(log.jobGroupId))
        .filter(Boolean)
      )
    );
    const operatorJobIds = Array.from(
      new Set(
        mappedLogs
          .filter((log: any) => String(log.role || "").toUpperCase() === "OPERATOR" && log.jobId)
          .map((log: any) => String(log.jobId))
          .filter(Boolean)
      )
    );

    if (operatorGroupIds.length === 0 && operatorJobIds.length === 0) {
      return res.json(createPaginatedResponse(mappedLogs, total, offset, limit));
    }

    const operatorGroupIdsAsBigInt = operatorGroupIds.map((value) => toBigInt(value)).filter((value): value is bigint => value !== undefined);

    const scopedOperatorLogWhere: any = {
      role: "OPERATOR",
      OR: [
        ...(operatorGroupIdsAsBigInt.length > 0 ? [{ jobGroupId: { in: operatorGroupIdsAsBigInt } }] : []),
        ...(operatorJobIds.length > 0 ? [{ jobId: { in: operatorJobIds } }] : []),
      ],
    };

    const [groupJobs, scopedOperatorLogs, operatorJobsById] = await prisma.$transaction([
      prisma.job.findMany({
        where: operatorGroupIdsAsBigInt.length > 0 ? { groupId: { in: operatorGroupIdsAsBigInt } } : { id: { in: [] } },
        select: { id: true, groupId: true, totalHrs: true, rate: true },
      }),
      prisma.employeeLog.findMany({
        where: scopedOperatorLogWhere,
      }),
      prisma.job.findMany({
        where: { id: { in: operatorJobIds } },
        select: { id: true, totalHrs: true, rate: true, qty: true },
      }),
    ]);

    const wedmAmountByGroupId = new Map<string, number>();
    const wedmAmountByJobId = new Map<string, number>();
    groupJobs.forEach((job) => {
      const key = String(job.groupId);
      wedmAmountByGroupId.set(key, (wedmAmountByGroupId.get(key) || 0) + Number(job.totalHrs || 0) * Number(job.rate || 0));
      wedmAmountByJobId.set(String(job.id), Number(job.totalHrs || 0) * Number(job.rate || 0));
    });
    operatorJobsById.forEach((job) => {
      wedmAmountByJobId.set(String(job.id), Number(job.totalHrs || 0) * Number(job.rate || 0));
    });

    const completedLogKeys = new Set<string>();
    const totalWorkedSecondsByGroupId = new Map<string, number>();
    const totalWorkedSecondsByJobId = new Map<string, number>();
    scopedOperatorLogs.forEach((log) => {
      const status = String(log.status || "").toUpperCase();

      if (status === "COMPLETED") {
        buildOperatorLogCompletionKey(log).forEach((key) => completedLogKeys.add(key));
      }
    });

    const visibleScopedOperatorLogs = scopedOperatorLogs.filter((log) => {
      const status = String(log.status || "").toUpperCase();
      if (status === "IN_PROGRESS" && log.endedAt) return false;
      if (status !== "IN_PROGRESS") return true;
      const completionKeys = buildOperatorLogCompletionKey(log);
      if (completionKeys.length === 0) return true;
      return !completionKeys.some((key) => completedLogKeys.has(key));
    });

    visibleScopedOperatorLogs.forEach((log) => {
      const status = String(log.status || "").toUpperCase();
      const groupId = String(log.jobGroupId || "").trim();
      const jobId = String(log.jobId || "").trim();

      if (status === "IN_PROGRESS" && log.endedAt) return;
      if (status !== "COMPLETED" && status !== "IN_PROGRESS" && status !== "REJECTED") return;
      const workedSeconds = getWorkedSecondsForOperatorLog(log);
      if (workedSeconds <= 0) return;
      if (groupId) {
        totalWorkedSecondsByGroupId.set(groupId, (totalWorkedSecondsByGroupId.get(groupId) || 0) + workedSeconds);
      }
      if (jobId) {
        totalWorkedSecondsByJobId.set(jobId, (totalWorkedSecondsByJobId.get(jobId) || 0) + workedSeconds);
      }
    });

    const visibleLogs = mappedLogs.filter((log: any) => {
      if (String(log.role || "").toUpperCase() !== "OPERATOR") return true;
      if (String(log.status || "").toUpperCase() === "IN_PROGRESS" && log.endedAt) return false;
      if (String(log.status || "").toUpperCase() !== "IN_PROGRESS") return true;
      const completionKeys = buildOperatorLogCompletionKey(log);
      if (completionKeys.length === 0) return true;
      return !completionKeys.some((key) => completedLogKeys.has(key));
    });

    const responseItems = visibleLogs.map((log: any) => {
      if (String(log.role || "").toUpperCase() !== "OPERATOR") return log;
      const jobId = String(log.jobId || "").trim();
      const groupId = String(log.jobGroupId || "").trim();
      const wedmAmount = (jobId ? wedmAmountByJobId.get(jobId) : 0) || (groupId ? wedmAmountByGroupId.get(groupId) : 0) || 0;
      const totalWorkedSeconds = (jobId ? totalWorkedSecondsByJobId.get(jobId) : 0) || (groupId ? totalWorkedSecondsByGroupId.get(groupId) : 0) || 0;
      const explicitRevenue = getOperatorRevenueValue(log);
      if (!wedmAmount || totalWorkedSeconds <= 0) {
        if (explicitRevenue === null) return log;
        return {
          ...log,
          revenue: Number(explicitRevenue.toFixed(2)),
          metadata: {
            ...(log.metadata || {}),
            revenue: Number(explicitRevenue.toFixed(2)),
          },
        };
      }
      const workedSeconds = getWorkedSecondsForOperatorLog(log);
      const revenue = Math.max(0, Number(((wedmAmount * workedSeconds) / totalWorkedSeconds).toFixed(2)));
      return {
        ...log,
        revenue,
        metadata: {
          ...(log.metadata || {}),
          revenue,
          wedmAmount,
        },
      };
    });

    res.json(createPaginatedResponse(responseItems, total, offset, limit));
  } catch (error: any) {
    console.error("Error fetching employee logs:", error);
    res.status(500).json({ message: "Error fetching employee logs" });
  }
});

export default router;
