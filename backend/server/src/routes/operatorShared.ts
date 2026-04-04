import { Prisma } from "@prisma/client";
import { formatDbDateTime } from "../utils/dateTime";
import { toBigInt } from "../utils/bigint";

export const operatorJobInclude: Prisma.JobInclude = {
  operatorCaptures: { orderBy: { createdAt: "asc" } },
  qaStates: true,
};

export const getUpdatedByName = (req: any): string => {
  const reqUser = req?.user as any;
  const fullName = String(reqUser?.fullName || "").trim();
  if (fullName) return fullName.toUpperCase();
  const firstName = String(reqUser?.firstName || "").trim();
  const lastName = String(reqUser?.lastName || "").trim();
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined.toUpperCase();
  const email = String(reqUser?.email || "").trim();
  return (email.split("@")[0]?.trim() || "").toUpperCase();
};

export const toUuid = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
};

export const withUserId = (userId?: string) => (userId ? { userId } : {});

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

export const getPagination = (req: any, defaultLimit = 15, maxLimit = 100) => {
  const limit = Math.min(parsePositiveInt(req.query.limit, defaultLimit), maxLimit);
  const offset = parseNonNegativeInt(req.query.offset, 0);
  return { limit, offset };
};

export const createPaginatedResponse = <T,>(items: T[], total: number, offset: number, limit: number) => ({
  items,
  total,
  offset,
  limit,
  hasMore: offset + items.length < total,
});

export const parseGroupIdOrNull = (value: string) => toBigInt(value);

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

export const getQuantityNumbersFromLog = (log: {
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

export const getWorkedSecondsForOperatorLog = (log: {
  durationSeconds?: number | null;
  metadata?: any;
}) => {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const fromMachineHours = parseMachineHoursToSeconds(metadata.machineHrs);
  if (fromMachineHours !== null && fromMachineHours > 0) return fromMachineHours;

  const fromWorkedSeconds = Number(metadata.workedSeconds || 0);
  if (Number.isFinite(fromWorkedSeconds) && fromWorkedSeconds > 0) {
    return Math.max(0, Math.round(fromWorkedSeconds));
  }

  return Math.max(0, Number(log.durationSeconds || 0));
};

export const rebalanceOperatorRevenueForJob = async (
  tx: any,
  job: {
    id: string;
    qty?: number | null;
    totalHrs?: unknown;
    rate?: unknown;
  }
) => {
  const jobId = String(job.id || "").trim();
  if (!jobId) return;

  const totalQuantity = Math.max(1, Number(job.qty || 1));
  const perQuantityRevenue =
    Math.max(0, Number(job.totalHrs || 0)) * Math.max(0, Number(job.rate || 0)) / totalQuantity;

  const logs = await tx.employeeLog.findMany({
    where: {
      jobId,
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: { in: ["COMPLETED", "REJECTED"] },
    },
    select: {
      id: true,
      durationSeconds: true,
      quantityFrom: true,
      quantityTo: true,
      quantityCount: true,
      metadata: true,
    },
  });

  const workedByQuantity = new Map<number, Array<{ logId: string; workedSeconds: number }>>();
  logs.forEach((log: any) => {
    const quantityNumbers = getQuantityNumbersFromLog(log);
    if (quantityNumbers.length === 0) return;
    const workedSeconds = getWorkedSecondsForOperatorLog(log);
    const workedSecondsPerQuantity = quantityNumbers.length > 0 ? workedSeconds / quantityNumbers.length : workedSeconds;

    quantityNumbers.forEach((quantityNumber) => {
      const entries = workedByQuantity.get(quantityNumber) || [];
      entries.push({ logId: String(log.id), workedSeconds: Math.max(0, workedSecondsPerQuantity) });
      workedByQuantity.set(quantityNumber, entries);
    });
  });

  const revenueByLogId = new Map<string, Record<string, number>>();
  workedByQuantity.forEach((entries, quantityNumber) => {
    const totalWorkedSeconds = entries.reduce((sum, entry) => sum + Math.max(0, entry.workedSeconds), 0);
    const fallbackShare = entries.length > 0 ? perQuantityRevenue / entries.length : 0;

    entries.forEach((entry) => {
      const current = revenueByLogId.get(entry.logId) || {};
      const allocated =
        totalWorkedSeconds > 0
          ? perQuantityRevenue * (Math.max(0, entry.workedSeconds) / totalWorkedSeconds)
          : fallbackShare;
      current[String(quantityNumber)] = Number(allocated.toFixed(2));
      revenueByLogId.set(entry.logId, current);
    });
  });

  for (const log of logs) {
    const metadata = ((log as any).metadata || {}) as Record<string, any>;
    const quantityNumbers = getQuantityNumbersFromLog(log as any);
    const revenueByQuantity = revenueByLogId.get(String(log.id)) || {};
    const revenue = Object.values(revenueByQuantity).reduce((sum, amount) => sum + Number(amount || 0), 0);

    await tx.employeeLog.update({
      where: { id: String(log.id) },
      data: {
        metadata: {
          ...metadata,
          quantityNumbers,
          perQuantityRevenue: Number(perQuantityRevenue.toFixed(2)),
          revenueByQuantity,
          revenue: Number(revenue.toFixed(2)),
          workedSeconds: getWorkedSecondsForOperatorLog(log as any),
          quantityRevenueModel: "WEDM_TIME_SPLIT",
        },
      },
    });
  }
};

export const resolveCaptureRange = ({
  totalQty,
  captureMode,
  quantityIndex,
  fromQty,
  toQty,
}: {
  totalQty: number;
  captureMode: unknown;
  quantityIndex: unknown;
  fromQty: unknown;
  toQty: unknown;
}) => {
  const mode: "RANGE" | "SINGLE" = captureMode === "RANGE" ? "RANGE" : "SINGLE";
  const fallbackFromQty = typeof quantityIndex === "number" ? quantityIndex + 1 : 1;
  const resolvedFromQty = Math.max(1, Number(fromQty || fallbackFromQty));
  const resolvedToQty =
    mode === "RANGE"
      ? Math.min(totalQty, Math.max(resolvedFromQty, Number(toQty || resolvedFromQty)))
      : Math.min(totalQty, resolvedFromQty);

  return {
    mode,
    resolvedFromQty,
    resolvedToQty,
    quantityCount: resolvedToQty - resolvedFromQty + 1,
  };
};

export const getOverlappingCaptureIds = (captures: any[], fromQty: number, toQty: number) =>
  captures
    .filter((entry: any) => {
      const entryFrom = Number(entry.fromQty || 1);
      const entryTo = Number(entry.toQty || entryFrom);
      return fromQty <= entryTo && toQty >= entryFrom;
    })
    .map((entry: any) => entry.id);

export const hasCaptureRangeOverlap = (captures: any[], fromQty: number, toQty: number) =>
  captures.some((entry: any) => {
    const entryFrom = Number(entry.fromQty || 1);
    const entryTo = Number(entry.toQty || entryFrom);
    return fromQty <= entryTo && toQty >= entryFrom;
  });

export const buildCaptureEntry = ({
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
  updatedBy,
}: {
  mode: "RANGE" | "SINGLE";
  resolvedFromQty: number;
  resolvedToQty: number;
  quantityCount: number;
  startTime: unknown;
  endTime: unknown;
  machineHrs: unknown;
  machineNumber: unknown;
  opsName: unknown;
  idleTime: unknown;
  idleTimeDuration: unknown;
  lastImageUrl: string | null;
  updatedBy: string;
}) => ({
  captureMode: mode,
  fromQty: resolvedFromQty,
  toQty: resolvedToQty,
  quantityCount,
  startTime: String(startTime || ""),
  endTime: String(endTime || ""),
  machineHrs: String(machineHrs || ""),
  machineNumber: String(machineNumber || ""),
  opsName: String(opsName || ""),
  idleTime: String(idleTime || ""),
  idleTimeDuration: String(idleTimeDuration || ""),
  lastImage: lastImageUrl || null,
  createdAt: formatDbDateTime(),
  createdBy: updatedBy,
});

export const buildOperatorLogPayload = ({
  existingLogId,
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
  forceDurationSeconds = false,
}: {
  existingLogId?: string | undefined;
  reqUser: any;
  refreshedJob: any;
  parsedStart: Date;
  parsedEnd: Date;
  mode: "RANGE" | "SINGLE";
  machineNumber: unknown;
  opsName: unknown;
  machineHrs: unknown;
  idleTime: unknown;
  idleTimeDuration: unknown;
  resolvedFromQty: number;
  resolvedToQty: number;
  quantityCount: number;
  captureEntry: { fromQty: number; toQty: number };
  forceDurationSeconds?: boolean;
}) => {
  const userId = toUuid(reqUser?.userId);
  const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
  const workedSeconds = forceDurationSeconds ? durationSeconds : parseMachineHoursToSeconds(machineHrs) ?? durationSeconds;
  const jobWedmAmount = Math.max(0, Number((refreshedJob as any).totalHrs || 0) * Number((refreshedJob as any).rate || 0));
  const totalQuantity = Math.max(1, Number((refreshedJob as any).qty || quantityCount || 1));
  const perQuantityRevenue = jobWedmAmount / totalQuantity;
  const estimatedHoursPerQuantity = perQuantityRevenue / 625;
  const estimatedSecondsPerQuantity = Math.max(0, Math.round(estimatedHoursPerQuantity * 3600));
  const estimatedSeconds = estimatedSecondsPerQuantity * Math.max(1, quantityCount);
  const overtimeSeconds = Math.max(0, workedSeconds - estimatedSeconds);
  const quantityNumbers = Array.from({ length: Math.max(1, quantityCount) }, (_, index) => resolvedFromQty + index);
  const workedToEstimatedRatio = estimatedSeconds > 0 ? Math.max(0, Math.min(1, workedSeconds / estimatedSeconds)) : 0;
  const settingNumber = (() => {
    const foundIndex = Array.isArray(refreshedJob.operatorCaptures)
      ? refreshedJob.operatorCaptures.findIndex(
          (entry: any) => entry.fromQty === captureEntry.fromQty && entry.toQty === captureEntry.toQty
        )
      : -1;
    return foundIndex >= 0 ? foundIndex + 1 : toNumber((refreshedJob as any).setting) || null;
  })();

  return {
    existingLogId,
    payload: {
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: "COMPLETED",
      ...withUserId(userId),
      userEmail: String(reqUser?.email || ""),
      userName: getUpdatedByName({ user: reqUser }),
      jobId: String(refreshedJob.id || ""),
      jobGroupId: toBigInt(refreshedJob.groupId) ?? null,
      refNumber: String(refreshedJob.refNumber || ""),
      settingLabel: settingNumber ? String(settingNumber) : String((refreshedJob as any).setting || ""),
      quantityFrom: resolvedFromQty,
      quantityTo: resolvedToQty,
      quantityCount,
      jobCustomer: String((refreshedJob as any).customer || ""),
      jobDescription: String((refreshedJob as any).description || ""),
      workItemTitle: `Job #${String((refreshedJob as any).refNumber || "-")}`,
      workSummary: `Machine ${machineNumber || "-"} | Ops ${opsName || "-"} | Hrs ${machineHrs || "-"}`,
      startedAt: parsedStart,
      endedAt: parsedEnd,
      durationSeconds: workedSeconds,
      metadata: {
        machineNumber: String(machineNumber || ""),
        opsName: String(opsName || ""),
        machineHrs: String(machineHrs || ""),
        idleTime: String(idleTime || ""),
        idleTimeDuration: String(idleTimeDuration || ""),
        captureMode: mode,
        quantityNumbers,
        workedSeconds,
        estimatedSeconds,
        estimatedSecondsPerQuantity,
        overtimeSeconds,
        workedToEstimatedRatio,
        wedmAmount: jobWedmAmount,
        perQuantityRevenue,
        revenue: 0,
      },
    },
  };
};
