import { formatDurationToClock } from "./operatorTimeUtils";
import { getDecodedTokenPayload } from "../../../utils/auth";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

export const parseAssignedOperators = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeOperatorName(entry))
    .filter((entry) => entry && entry.toLowerCase() !== "unassign" && entry.toLowerCase() !== "unassigned");

export const getCurrentUserOperatorTokens = (fallbackDisplayName?: string) => {
  const decoded = getDecodedTokenPayload() || {};
  const tokens = new Set<string>();
  const addToken = (value: unknown) => {
    const normalized = normalizeOperatorName(value);
    if (normalized) tokens.add(normalized);
  };

  addToken(fallbackDisplayName);
  addToken(decoded.fullName);
  addToken(decoded.name);
  addToken(decoded.username);
  addToken(decoded.firstName);
  addToken(decoded.lastName);
  addToken(decoded.empId);

  const joinedName = `${String(decoded.firstName || "").trim()} ${String(decoded.lastName || "").trim()}`.trim();
  addToken(joinedName);

  const email = String(decoded.email || "").trim();
  addToken(email);
  addToken(email.split("@")[0]);

  return tokens;
};

export const isCurrentUserAssignedToJob = (assignedTo: unknown, currentUserDisplayName: string, isAdmin: boolean) =>
  isAdmin || parseAssignedOperators(assignedTo).some((operatorName) => getCurrentUserOperatorTokens(currentUserDisplayName).has(operatorName));

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
