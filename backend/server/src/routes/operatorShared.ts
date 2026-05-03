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

const parsePauseSessionDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const raw = String(value || "").trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const parsedNumeric = new Date(numeric);
    if (!Number.isNaN(parsedNumeric.getTime())) return parsedNumeric;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeOperatorPauseSessions = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const pauseStart = parsePauseSessionDate((entry as any)?.pauseStartTime);
      const pauseEnd = parsePauseSessionDate((entry as any)?.pauseEndTime);
      if (!pauseStart) return null;

      const explicitDuration = Number((entry as any)?.pauseDuration || 0);
      const computedDuration = pauseEnd
        ? Math.max(0, Math.floor((pauseEnd.getTime() - pauseStart.getTime()) / 1000))
        : Math.max(0, Math.floor(explicitDuration));

      return {
        pauseStartTime: pauseStart.toISOString(),
        pauseEndTime: pauseEnd ? pauseEnd.toISOString() : null,
        pauseDuration: computedDuration,
        reason: String((entry as any)?.reason || "").trim(),
        operatorName: String((entry as any)?.operatorName || "").trim(),
      };
    })
    .filter((entry): entry is {
      pauseStartTime: string;
      pauseEndTime: string | null;
      pauseDuration: number;
      reason: string;
      operatorName: string;
    } => Boolean(entry));
};

const estimatedHoursFromAmount = (amount: number): number => {
  return (Number(amount || 0) || 0) / 625;
};

const estimatedDurationSecondsFromHours = (hours: number): number => {
  const safeHours = Number(hours || 0) || 0;
  if (safeHours <= 0) return 0;
  // Convert hours directly to seconds without minimum minute constraint
  return Math.max(0, Math.round(Number(safeHours.toFixed(4)) * 3600));
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
  const fromWorkedSeconds = Number(metadata.workedSeconds || 0);
  if (Number.isFinite(fromWorkedSeconds) && fromWorkedSeconds > 0) {
    return Math.max(0, Math.round(fromWorkedSeconds));
  }

  const fromMachineHours = parseMachineHoursToSeconds(metadata.machineHrs);
  if (fromMachineHours !== null && fromMachineHours > 0) return fromMachineHours;

  return Math.max(0, Number(log.durationSeconds || 0));
};

const getRawWorkedSecondsForOperatorLog = (log: {
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
  // Use the job's actual estimated hours directly, not revenue-based calculation
  const estimatedHoursPerQuantity = Math.max(0, Number(job.totalHrs || 0)) / totalQuantity;
  const estimatedSecondsPerQuantity = estimatedDurationSecondsFromHours(estimatedHoursPerQuantity);

  const logs = await tx.employeeLog.findMany({
    where: {
      jobId,
      role: "OPERATOR",
      activityType: "OPERATOR_PRODUCTION",
      status: { in: ["COMPLETED", "REJECTED"] },
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      quantityFrom: true,
      quantityTo: true,
      quantityCount: true,
      metadata: true,
    },
  });

  const workedByQuantity = new Map<
    number,
    Array<{
      logId: string;
      workedSeconds: number;
      rawWorkedSeconds: number;
      durationSeconds: number;
      startedAtMs: number;
      endedAtMs: number;
    }>
  >();
  logs.forEach((log: any) => {
    const quantityNumbers = getQuantityNumbersFromLog(log);
    if (quantityNumbers.length === 0) return;
    const rawWorkedSeconds = getRawWorkedSecondsForOperatorLog(log);
    const durationSeconds = Math.max(0, Number(log.durationSeconds || 0));
    const rawWorkedSecondsPerQuantity = quantityNumbers.length > 0 ? rawWorkedSeconds / quantityNumbers.length : rawWorkedSeconds;
    const durationSecondsPerQuantity = quantityNumbers.length > 0 ? durationSeconds / quantityNumbers.length : durationSeconds;
    const startedAtMs = log.startedAt instanceof Date ? log.startedAt.getTime() : 0;
    const endedAtMs = log.endedAt instanceof Date ? log.endedAt.getTime() : startedAtMs;

    quantityNumbers.forEach((quantityNumber) => {
      const entries = workedByQuantity.get(quantityNumber) || [];
      entries.push({
        logId: String(log.id),
        workedSeconds: Math.max(0, rawWorkedSecondsPerQuantity),
        rawWorkedSeconds: Math.max(0, rawWorkedSecondsPerQuantity),
        durationSeconds: Math.max(0, durationSecondsPerQuantity),
        startedAtMs,
        endedAtMs,
      });
      workedByQuantity.set(quantityNumber, entries);
    });
  });

  const revenueByLogId = new Map<string, Record<string, number>>();
  const estimatedSecondsByLogId = new Map<string, number>();
  const creditedWorkedSecondsByLogId = new Map<string, number>();
  const overtimeSecondsByLogId = new Map<string, number>();
  const actualWorkedSecondsByLogId = new Map<string, number>();

  workedByQuantity.forEach((entries, quantityNumber) => {
    const sortedEntries = [...entries].sort((left, right) => {
      if (left.startedAtMs !== right.startedAtMs) return left.startedAtMs - right.startedAtMs;
      if (left.endedAtMs !== right.endedAtMs) return left.endedAtMs - right.endedAtMs;
      return left.logId.localeCompare(right.logId);
    });

    let previousCumulativeWorkedSeconds = 0;
    const normalizedEntries = sortedEntries.map((entry) => {
      const safeRawWorkedSeconds = Math.max(0, entry.rawWorkedSeconds);
      const safeDurationSeconds = Math.max(0, entry.durationSeconds);
      const looksCumulative =
        previousCumulativeWorkedSeconds > 0 &&
        safeRawWorkedSeconds > safeDurationSeconds &&
        safeRawWorkedSeconds >= previousCumulativeWorkedSeconds + Math.max(1, safeDurationSeconds - 1);

      const normalizedWorkedSeconds = looksCumulative
        ? Math.max(0, safeRawWorkedSeconds - previousCumulativeWorkedSeconds)
        : safeRawWorkedSeconds > 0
          ? safeRawWorkedSeconds
          : safeDurationSeconds;

      previousCumulativeWorkedSeconds = Math.max(previousCumulativeWorkedSeconds, safeRawWorkedSeconds);

      return {
        ...entry,
        workedSeconds: normalizedWorkedSeconds,
      };
    });

    const totalWorkedSeconds = normalizedEntries.reduce((sum, entry) => sum + Math.max(0, entry.workedSeconds), 0);
    const fallbackShare = normalizedEntries.length > 0 ? 1 / normalizedEntries.length : 0;
    let remainingRevenue = Math.max(0, Number(perQuantityRevenue.toFixed(2)));
    let remainingEstimatedSeconds = Math.max(0, estimatedSecondsPerQuantity);

    normalizedEntries.forEach((entry, index) => {
      const currentRevenueByQuantity = revenueByLogId.get(entry.logId) || {};
      const safeWorkedSeconds = Math.max(0, entry.workedSeconds);
      const workShare = totalWorkedSeconds > 0 ? safeWorkedSeconds / totalWorkedSeconds : fallbackShare;
      const isLastEntry = index === normalizedEntries.length - 1;
      const allocatedRevenue = isLastEntry
        ? Math.max(0, Number(remainingRevenue.toFixed(2)))
        : Math.max(0, Number((perQuantityRevenue * workShare).toFixed(2)));
      const estimatedSecondsShare = isLastEntry
        ? Math.max(0, remainingEstimatedSeconds)
        : Math.max(0, estimatedSecondsPerQuantity * workShare);
      const overtimeSeconds = Math.max(0, safeWorkedSeconds - estimatedSecondsShare);

      remainingRevenue = Math.max(0, Number((remainingRevenue - allocatedRevenue).toFixed(4)));
      remainingEstimatedSeconds = Math.max(0, remainingEstimatedSeconds - estimatedSecondsShare);

      currentRevenueByQuantity[String(quantityNumber)] = allocatedRevenue;
      revenueByLogId.set(entry.logId, currentRevenueByQuantity);
      estimatedSecondsByLogId.set(entry.logId, (estimatedSecondsByLogId.get(entry.logId) || 0) + estimatedSecondsShare);
      creditedWorkedSecondsByLogId.set(
        entry.logId,
        (creditedWorkedSecondsByLogId.get(entry.logId) || 0) + safeWorkedSeconds
      );
      overtimeSecondsByLogId.set(entry.logId, (overtimeSecondsByLogId.get(entry.logId) || 0) + overtimeSeconds);
      actualWorkedSecondsByLogId.set(entry.logId, (actualWorkedSecondsByLogId.get(entry.logId) || 0) + safeWorkedSeconds);
    });
  });

  for (const log of logs) {
    const metadata = ((log as any).metadata || {}) as Record<string, any>;
    const quantityNumbers = getQuantityNumbersFromLog(log as any);
    const revenueByQuantity = revenueByLogId.get(String(log.id)) || {};
    const revenue = Object.values(revenueByQuantity).reduce((sum, amount) => sum + Number(amount || 0), 0);
    const actualWorkedSeconds = actualWorkedSecondsByLogId.get(String(log.id)) || getRawWorkedSecondsForOperatorLog(log as any);
    const estimatedSeconds = estimatedSecondsByLogId.get(String(log.id)) || 0;
    const creditedWorkedSeconds = creditedWorkedSecondsByLogId.get(String(log.id)) || 0;
    const overtimeSeconds = Math.max(
      0,
      overtimeSecondsByLogId.get(String(log.id)) || Math.max(0, actualWorkedSeconds - creditedWorkedSeconds)
    );

    await tx.employeeLog.update({
      where: { id: String(log.id) },
      data: {
        durationSeconds: Math.max(0, Math.round(actualWorkedSeconds)),
        metadata: {
          ...metadata,
          quantityNumbers,
          perQuantityRevenue: Number(perQuantityRevenue.toFixed(2)),
          revenueByQuantity,
          revenue: Number(revenue.toFixed(2)),
          workedSeconds: Math.max(0, Math.round(actualWorkedSeconds)),
          creditedWorkedSeconds,
          estimatedSeconds,
          estimatedSecondsPerQuantity,
          overtimeSeconds,
          workedToEstimatedRatio:
            estimatedSeconds > 0 ? Number((Math.max(0, actualWorkedSeconds / estimatedSeconds)).toFixed(4)) : 0,
          quantityRevenueModel: "WEDM_PROPORTIONAL_TIME_SPLIT",
          revenueCapMode: "PROPORTIONAL_ACTUAL_TIME",
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
  pauseSessions,
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
  pauseSessions?: unknown;
  resolvedFromQty: number;
  resolvedToQty: number;
  quantityCount: number;
  captureEntry: { fromQty: number; toQty: number };
  forceDurationSeconds?: boolean;
}) => {
  const userId = toUuid(reqUser?.userId);
  const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
  // Use the job's actual worked hours, not the machineHrs parameter which might be wrong
  const workedSeconds = durationSeconds;
  const jobWedmAmount = Math.max(0, Number((refreshedJob as any).totalHrs || 0) * Number((refreshedJob as any).rate || 0));
  const totalQuantity = Math.max(1, Number((refreshedJob as any).qty || quantityCount || 1));
  const perQuantityRevenue = jobWedmAmount / totalQuantity;
  // Use the job's actual estimated hours directly, not revenue-based calculation
  const estimatedHoursPerQuantity = Math.max(0, Number((refreshedJob as any).totalHrs || 0)) / totalQuantity;
  const estimatedSecondsPerQuantity = estimatedDurationSecondsFromHours(estimatedHoursPerQuantity);
  const estimatedSeconds = estimatedSecondsPerQuantity * Math.max(1, quantityCount);
  const overtimeSeconds = Math.max(0, workedSeconds - estimatedSeconds);
  const quantityNumbers = Array.from({ length: Math.max(1, quantityCount) }, (_, index) => resolvedFromQty + index);
  const workedToEstimatedRatio = estimatedSeconds > 0 ? Math.max(0, Math.min(1, workedSeconds / estimatedSeconds)) : 0;
  const normalizedPauseSessions = normalizeOperatorPauseSessions(pauseSessions);
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
        pauseSessions: normalizedPauseSessions,
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
