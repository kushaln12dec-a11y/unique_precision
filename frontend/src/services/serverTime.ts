import { apiUrl } from "./apiClient";

let serverTimeOffsetMs = 0;
let lastServerTimeSyncAtMs = 0;
let serverTimeSyncPromise: Promise<number> | null = null;
const SERVER_TIME_SYNC_TTL_MS = 15_000;

const parseHeaderTime = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const syncServerTimeOffset = (
  response: Response,
  timing?: { requestStartedAtMs?: number; responseReceivedAtMs?: number }
) => {
  const preciseServerTime = Number(response.headers.get("x-server-time-ms"));
  if (Number.isFinite(preciseServerTime) && preciseServerTime > 0) {
    const requestStartedAtMs = Number(timing?.requestStartedAtMs || 0);
    const responseReceivedAtMs = Number(timing?.responseReceivedAtMs || Date.now());
    const midpointMs =
      requestStartedAtMs > 0 && responseReceivedAtMs >= requestStartedAtMs
        ? requestStartedAtMs + Math.floor((responseReceivedAtMs - requestStartedAtMs) / 2)
        : Date.now();
    serverTimeOffsetMs = preciseServerTime - midpointMs;
    lastServerTimeSyncAtMs = Date.now();
    return;
  }
  const headerTimeMs = parseHeaderTime(response.headers.get("date"));
  if (headerTimeMs === null) return;
  serverTimeOffsetMs = headerTimeMs - Date.now();
  lastServerTimeSyncAtMs = Date.now();
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
    syncServerTimeOffset(response, { requestStartedAtMs, responseReceivedAtMs });
    return serverTimeOffsetMs;
  })().finally(() => {
    serverTimeSyncPromise = null;
  });

  return serverTimeSyncPromise;
};
