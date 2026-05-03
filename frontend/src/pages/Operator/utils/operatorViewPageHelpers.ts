import { formatDurationToClock } from "./operatorTimeUtils";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

export const parseAssignedOperators = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeOperatorName(entry))
    .filter((entry) => entry && entry.toLowerCase() !== "unassign" && entry.toLowerCase() !== "unassigned");

export const isCurrentUserAssignedToJob = (assignedTo: unknown, currentUserDisplayName: string, isAdmin: boolean) =>
  isAdmin || parseAssignedOperators(assignedTo).includes(normalizeOperatorName(currentUserDisplayName));

export const buildStableOperatorList = (names: string[]) =>
  Array.from(
    new Map(
      names
        .map((name) => normalizeOperatorName(name))
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name] as const)
    ).values()
  ).sort((left, right) => left.localeCompare(right));

export const getPersistedIdleDuration = (totalPauseTime: number, idleTimeDuration?: string) =>
  totalPauseTime > 0 ? formatDurationToClock(totalPauseTime) : String(idleTimeDuration || "");

export const getPersistedIdleReason = (
  pauseSessions: Array<{ reason?: string }> = [],
  idleTime?: string
) => {
  const idleReasons = Array.from(
    new Set(
      pauseSessions
        .map((session) => String(session.reason || "").trim())
        .filter(Boolean)
    )
  );

  return idleReasons.length <= 1
    ? String(idleReasons[0] || idleTime || "")
    : idleReasons.join(", ");
};
