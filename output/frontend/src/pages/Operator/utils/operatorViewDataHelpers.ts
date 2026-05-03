import type { JobEntry } from "../../../types/job";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
import type { CutInputData, PauseSession, QuantityInputData } from "../types/cutInput";
import { parseDurationToSeconds, parseOperatorDateTime } from "./operatorTimeUtils";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

export const parseAssignedOperators = (rawAssignedTo: unknown): string[] => {
  if (Array.isArray(rawAssignedTo)) {
    return [...new Set(rawAssignedTo.map((value) => normalizeOperatorName(value)).filter(Boolean))];
  }
  const normalized = String(rawAssignedTo || "").trim();
  const normalizedLower = normalized.toLowerCase();
  if (!normalized || normalizedLower === "unassigned" || normalizedLower === "unassign") return [];
  return [...new Set(normalized.split(",").map((value) => normalizeOperatorName(value)).filter(Boolean))];
};

const parseOpsNames = (rawValue: unknown): string[] =>
  String(rawValue || "")
    .split(",")
    .map((value) => normalizeOperatorName(value))
    .filter(Boolean);

const parsePauseSessionDateMs = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value || "").trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

type OperatorLogLike = {
  quantityFrom?: number | null;
  quantityTo?: number | null;
  userName?: string | null;
  metadata?: Record<string, any> | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  status?: string | null;
};

const buildPauseSessionKey = (session: PauseSession) =>
  [
    Number(session.pauseStartTime || 0),
    Number(session.pauseEndTime || 0),
    Number(session.pauseDuration || 0),
    String(session.reason || "").trim(),
    String(session.operatorName || "").trim(),
  ].join("|");

const collectPauseSessionsForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]): PauseSession[] => {
  const deduped = new Map<string, PauseSession>();

  logsForJob.forEach((log) => {
    const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
    const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
    if (quantityNumber < fromQty || quantityNumber > toQty) return;

    const metadata = ((log.metadata as any) || {}) as Record<string, any>;
    const persistedSessions = Array.isArray(metadata.pauseSessions) ? metadata.pauseSessions : [];
    persistedSessions.forEach((entry) => {
      const pauseStartTime = parsePauseSessionDateMs(entry?.pauseStartTime);
      if (!pauseStartTime) return;
      const pauseEndTime = parsePauseSessionDateMs(entry?.pauseEndTime);
      const explicitDuration = Number(entry?.pauseDuration || 0);
      const pauseDuration =
        pauseEndTime && pauseEndTime >= pauseStartTime
          ? Math.max(0, Math.floor((pauseEndTime - pauseStartTime) / 1000))
          : Math.max(0, Math.floor(explicitDuration));
      const session: PauseSession = {
        pauseStartTime,
        pauseEndTime,
        pauseDuration,
        reason: String(entry?.reason || "").trim(),
        operatorName: String(entry?.operatorName || "").trim() || undefined,
      };
      deduped.set(buildPauseSessionKey(session), session);
    });

    const idleStartedAt = parsePauseSessionDateMs(metadata.idleStartedAt);
    if (!idleStartedAt) return;
    const idleEndedAt = parsePauseSessionDateMs(metadata.idleEndedAt);
    const explicitIdleDuration = Number(metadata.idleDurationSeconds || 0);
    const pauseDuration =
      idleEndedAt && idleEndedAt >= idleStartedAt
        ? Math.max(0, Math.floor((idleEndedAt - idleStartedAt) / 1000))
        : Math.max(0, Math.floor(explicitIdleDuration));
    const session: PauseSession = {
      pauseStartTime: idleStartedAt,
      pauseEndTime: idleEndedAt,
      pauseDuration,
      reason: String(metadata.idleTime || "").trim() || "Shift Over",
      operatorName: String(metadata.idleOperatorName || log.userName || "").trim() || undefined,
    };
    deduped.set(buildPauseSessionKey(session), session);
  });

  return Array.from(deduped.values()).sort((left, right) => left.pauseStartTime - right.pauseStartTime);
};

export const getLatestActiveLogForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]) =>
  logsForJob
    .filter((log) => {
      const status = String(log.status || "").toUpperCase();
      if (status !== "IN_PROGRESS" || log.endedAt) return false;
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      return quantityNumber >= fromQty && quantityNumber <= toQty;
    })
    .sort((left, right) => {
      const leftTime = new Date(String(left.startedAt || 0)).getTime();
      const rightTime = new Date(String(right.startedAt || 0)).getTime();
      return rightTime - leftTime;
    })[0];

const getLatestShiftOverLogForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]) =>
  logsForJob
    .filter((log) => {
      const status = String(log.status || "").toUpperCase();
      if (status !== "REJECTED") return false;
      const reason = String((log.metadata as any)?.idleTime || "").trim();
      if (reason !== "Shift Over") return false;
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      return quantityNumber >= fromQty && quantityNumber <= toQty;
    })
    .sort((left, right) => {
      const leftTime = new Date(String(left.endedAt || 0)).getTime();
      const rightTime = new Date(String(right.endedAt || 0)).getTime();
      return rightTime - leftTime;
    })[0];

export const mergeJobAssignmentsIntoInputs = (
  previousInputs: Map<number | string, CutInputData>,
  nextJobs: JobEntry[]
) => {
  const nextInputs = new Map(previousInputs);

  nextJobs.forEach((job) => {
    const currentCut = nextInputs.get(job.id);
    if (!currentCut?.quantities?.length) return;

    const assignedOperators = parseAssignedOperators((job as any).assignedTo || "");
    const sharedMachine = String((job as any).machineNumber || "").trim();
    const mergedQuantities = currentCut.quantities.map((qty) => {
      const hasLockedCapture = Boolean(String(qty.endTime || "").trim());
      if (hasLockedCapture) return qty;

      return {
        ...qty,
        machineNumber: sharedMachine || String(qty.machineNumber || "").trim(),
        opsName: assignedOperators,
      };
    });

    nextInputs.set(job.id, {
      ...currentCut,
      quantities: mergedQuantities,
    });
  });

  return nextInputs;
};

export const getDurationSeconds = (entry: {
  startTime?: string | null;
  endTime?: string | null;
  machineHrs?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
}) => {
  const machineHours = Number(entry.machineHrs || 0);
  if (Number.isFinite(machineHours) && machineHours > 0) {
    return Math.max(0, Math.round(machineHours * 3600));
  }

  const directDuration = Number(entry.durationSeconds || 0);
  if (Number.isFinite(directDuration) && directDuration > 0) {
    return Math.max(0, Math.round(directDuration));
  }

  const startValue = String(entry.startTime || entry.startedAt || "").trim();
  const endValue = String(entry.endTime || entry.endedAt || "").trim();
  if (!startValue || !endValue) return 0;

  const startMs = parseOperatorDateTime(startValue) ?? new Date(startValue).getTime();
  const endMs = parseOperatorDateTime(endValue) ?? new Date(endValue).getTime();
  if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
    return Math.max(0, Math.round((endMs - startMs) / 1000));
  }
  return 0;
};

export const collectOperatorHistoryForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]): string[] => {
  const seen = new Set<string>();
  const collected: string[] = [];
  const pushName = (rawValue: unknown) => {
    String(rawValue || "")
      .split(",")
      .map((value) => normalizeOperatorName(value))
      .filter(Boolean)
      .forEach((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        collected.push(value);
      });
  };

  logsForJob.forEach((log) => {
    const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
    if (logDuration <= 0) return;
    const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
    const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
    if (quantityNumber < fromQty || quantityNumber > toQty) return;
    pushName(log?.userName);
  });

  return collected;
};

export const collectOperatorHistoryDetailsForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]) => {
  const summary = new Map<string, { durationSeconds: number; revenue: number }>();
  const addEntry = (rawName: unknown, durationSeconds: number, revenue = 0) => {
    const name = normalizeOperatorName(rawName);
    if (!name) return;
    const existing = summary.get(name) || { durationSeconds: 0, revenue: 0 };
    summary.set(name, {
      durationSeconds: existing.durationSeconds + Math.max(0, durationSeconds),
      revenue: existing.revenue + Math.max(0, revenue),
    });
  };

  logsForJob.forEach((log) => {
    const status = String(log.status || "").toUpperCase();
    if (status !== "COMPLETED" && status !== "REJECTED") return;
    const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
    const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
    if (quantityNumber < fromQty || quantityNumber > toQty) return;
    const rangeCount = Math.max(1, toQty - fromQty + 1);
    const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
    if (logDuration <= 0) return;
    const revenueByQuantity = (((log.metadata as any)?.revenueByQuantity || {}) as Record<string, number>) || {};
    const quantityRevenue = Number(revenueByQuantity[String(quantityNumber)] || 0);
    const fallbackRevenue = Number((log.metadata as any)?.revenue || 0);
    const perQuantityRevenue = quantityRevenue > 0 ? quantityRevenue : (fallbackRevenue > 0 ? fallbackRevenue / rangeCount : 0);
    addEntry(log?.userName, logDuration / rangeCount, perQuantityRevenue);
  });

  return Array.from(summary.entries())
    .map(([name, detail]) => ({
      name,
      durationSeconds: Math.max(0, Math.round(detail.durationSeconds)),
      revenue: Math.max(0, Number(detail.revenue.toFixed(2))),
    }))
    .filter((entry) => entry.durationSeconds > 0)
    .sort((left, right) => right.durationSeconds - left.durationSeconds);
};

export const getWorkedDurationSecondsForQuantity = (quantityNumber: number, logsForJob: OperatorLogLike[]) =>
  logsForJob.reduce((sum, log) => {
    const status = String(log.status || "").toUpperCase();
    if (status !== "COMPLETED" && status !== "REJECTED") return sum;
    const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
    const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
    if (quantityNumber < fromQty || quantityNumber > toQty) return sum;
    const rangeCount = Math.max(1, toQty - fromQty + 1);
    const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
    if (logDuration <= 0) return sum;
    return sum + logDuration / rangeCount;
  }, 0);

export const hydrateQuantityFromLogs = (
  quantity: QuantityInputData,
  quantityNumber: number,
  job: JobEntry,
  logsForJob: OperatorLogLike[]
): QuantityInputData => {
  const workedDurationSeconds = Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(quantityNumber, logsForJob)));
  const activeLog = getLatestActiveLogForQuantity(quantityNumber, logsForJob);
  const sharedMachine = String((job as any).machineNumber || "").trim();
  const assignedOperators = parseAssignedOperators((job as any).assignedTo || "");
  const activeLogStartMs = activeLog?.startedAt ? new Date(String(activeLog.startedAt)).getTime() : null;
  const activeOps = parseOpsNames((activeLog?.metadata as any)?.opsName || "");
  const activeMachine = String((activeLog?.metadata as any)?.machineNumber || "").trim();
  const pauseMarker = String(quantity.idleTime || "").trim() || String((job as any).idleTime || "").trim();
  const persistedIdleDuration = String(quantity.idleTimeDuration || "").trim() || String((job as any).idleTimeDuration || "").trim();
  const persistedPauseSeconds = parseDurationToSeconds(persistedIdleDuration);
  const latestShiftOverLog = pauseMarker === "Shift Over" ? getLatestShiftOverLogForQuantity(quantityNumber, logsForJob) : null;
  const shiftOverEndedAt = String(latestShiftOverLog?.endedAt || "").trim();
  const fallbackPauseStartedAt = String((job as any).updatedAt || "").trim();
  const pauseStartedAt = shiftOverEndedAt || fallbackPauseStartedAt;
  const pauseStartedMs = pauseStartedAt ? new Date(pauseStartedAt).getTime() : null;
  const pauseSessions = collectPauseSessionsForQuantity(quantityNumber, logsForJob);

  if (activeLog && activeLogStartMs && Number.isFinite(activeLogStartMs)) {
    return {
      ...quantity,
      startTime: getCurrentISTDateTime(activeLogStartMs),
      startTimeEpochMs: activeLogStartMs,
      endTime: "",
      endTimeEpochMs: null,
      machineNumber: activeMachine || quantity.machineNumber || sharedMachine,
      opsName: activeOps.length > 0 ? activeOps : quantity.opsName.length > 0 ? quantity.opsName : assignedOperators,
      workedDurationSeconds,
      pauseTimeOffsetSeconds: persistedPauseSeconds,
      operatorHistory: collectOperatorHistoryForQuantity(quantityNumber, logsForJob),
      operatorHistoryDetails: collectOperatorHistoryDetailsForQuantity(quantityNumber, logsForJob),
      idleTime: "",
      idleTimeDuration: persistedIdleDuration,
      isPaused: false,
      pauseStartTime: null,
      currentPauseOperatorName: "",
      totalPauseTime: persistedPauseSeconds,
      pausedElapsedTime: 0,
      pauseSessions,
      currentPauseReason: "",
    };
  }

  const hasOpenServerState = Boolean(String(quantity.startTime || "").trim()) && !String(quantity.endTime || "").trim();
  const isPaused = hasOpenServerState && Boolean(pauseMarker);

  return {
    ...quantity,
    machineNumber: String(quantity.machineNumber || "").trim() || sharedMachine,
    opsName: quantity.opsName.length > 0 ? quantity.opsName : assignedOperators,
    workedDurationSeconds,
    pauseTimeOffsetSeconds: isPaused && pauseMarker === "Shift Over" ? persistedPauseSeconds : 0,
    operatorHistory: collectOperatorHistoryForQuantity(quantityNumber, logsForJob),
    operatorHistoryDetails: collectOperatorHistoryDetailsForQuantity(quantityNumber, logsForJob),
    idleTimeDuration: persistedIdleDuration,
    isPaused,
    pauseStartTime: isPaused && pauseStartedMs && Number.isFinite(pauseStartedMs) ? pauseStartedMs : null,
    currentPauseOperatorName:
      isPaused && pauseMarker
        ? String(
            ((latestShiftOverLog?.metadata as any)?.idleOperatorName || latestShiftOverLog?.userName || quantity.currentPauseOperatorName || "")
          ).trim()
        : "",
    pausedElapsedTime: isPaused ? workedDurationSeconds : 0,
    totalPauseTime: persistedPauseSeconds,
    pauseSessions,
    currentPauseReason: isPaused ? pauseMarker : "",
  };
};
