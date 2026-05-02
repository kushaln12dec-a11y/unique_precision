let serverTimeOffsetMs = 0;

const parseHeaderTime = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const syncServerTimeOffset = (response: Response) => {
  const preciseServerTime = Number(response.headers.get("x-server-time-ms"));
  if (Number.isFinite(preciseServerTime) && preciseServerTime > 0) {
    serverTimeOffsetMs = preciseServerTime - Date.now();
    return;
  }
  const headerTimeMs = parseHeaderTime(response.headers.get("date"));
  if (headerTimeMs === null) return;
  serverTimeOffsetMs = headerTimeMs - Date.now();
};

export const getServerNowMs = (): number => Date.now() + serverTimeOffsetMs;
