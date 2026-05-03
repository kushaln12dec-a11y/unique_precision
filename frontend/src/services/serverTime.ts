import { apiUrl } from "./apiClient";

let serverTimeOffsetMs = 0;
let lastServerTimeSyncAtMs = 0;
let serverTimeSyncPromise: Promise<number> | null = null;
const SERVER_TIME_SYNC_TTL_MS = 15_000;
const MAX_SERVER_TIME_SYNC_RTT_MS = 2_000;

const parseHeaderTime = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const syncServerTimeOffset = (
  response: Response,
  timing?: { requestStartedAtMs?: number; responseReceivedAtMs?: number; maxRoundTripMs?: number }
) => {
  const requestStartedAtMs = Number(timing?.requestStartedAtMs || 0);
  const responseReceivedAtMs = Number(timing?.responseReceivedAtMs || Date.now());
  const roundTripMs =
    requestStartedAtMs > 0 && responseReceivedAtMs >= requestStartedAtMs
      ? responseReceivedAtMs - requestStartedAtMs
      : null;
  const maxRoundTripMs = Number(timing?.maxRoundTripMs || 0) || MAX_SERVER_TIME_SYNC_RTT_MS;
  if (roundTripMs !== null && roundTripMs > maxRoundTripMs) {
    return serverTimeOffsetMs;
  }

  const preciseServerTime = Number(response.headers.get("x-server-time-ms"));
  if (Number.isFinite(preciseServerTime) && preciseServerTime > 0) {
    const midpointMs =
      requestStartedAtMs > 0 && responseReceivedAtMs >= requestStartedAtMs
        ? requestStartedAtMs + Math.floor((responseReceivedAtMs - requestStartedAtMs) / 2)
        : Date.now();
    serverTimeOffsetMs = preciseServerTime - midpointMs;
    lastServerTimeSyncAtMs = Date.now();
    return serverTimeOffsetMs;
  }
  const headerTimeMs = parseHeaderTime(response.headers.get("date"));
  if (headerTimeMs === null) return serverTimeOffsetMs;
  serverTimeOffsetMs = headerTimeMs - Date.now();
  lastServerTimeSyncAtMs = Date.now();
  return serverTimeOffsetMs;
};

export const getServerNowMs = (): number => Date.now() + serverTimeOffsetMs;

export const refreshServerTimeOffset = async (force = false): Promise<number> => {
  const now = Date.now();
  if (!force && lastServerTimeSyncAtMs > 0 && now - lastServerTimeSyncAtMs < SERVER_TIME_SYNC_TTL_MS) {
    return serverTimeOffsetMs;
  }

  if (serverTimeSyncPromise) {
    return serverTimeSyncPromise;
  }

  serverTimeSyncPromise = (async () => {
    const requestStartedAtMs = Date.now();
    const response = await fetch(apiUrl("/api/health"), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    const responseReceivedAtMs = Date.now();
    syncServerTimeOffset(response, {
      requestStartedAtMs,
      responseReceivedAtMs,
      maxRoundTripMs: MAX_SERVER_TIME_SYNC_RTT_MS,
    });
    return serverTimeOffsetMs;
  })().finally(() => {
    serverTimeSyncPromise = null;
  });

  return serverTimeSyncPromise;
};
