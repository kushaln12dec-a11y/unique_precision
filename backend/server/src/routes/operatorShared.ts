import { Prisma } from "@prisma/client";
import { formatDbDateTime } from "../utils/dateTime";
import { toBigInt } from "../utils/bigint";

export const operatorJobInclude: Prisma.JobInclude = {
  operatorCaptures: { orderBy: { createdAt: "asc" } },
  qaStates: true,
};

export const getUpdatedByName = (req: any): string => {
  if (req.user && (req.user as any).fullName) {
    return String((req.user as any).fullName);
  }
  return "";
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
}) => {
  const userId = toUuid(reqUser?.userId);
  const durationSeconds = Math.max(0, Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 1000));
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
      userName: String(reqUser?.fullName || "").trim(),
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
      durationSeconds,
      metadata: {
        machineNumber: String(machineNumber || ""),
        opsName: String(opsName || ""),
        machineHrs: String(machineHrs || ""),
        idleTime: String(idleTime || ""),
        idleTimeDuration: String(idleTimeDuration || ""),
        captureMode: mode,
      },
    },
  };
};
