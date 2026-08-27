import rateLimit from "express-rate-limit";

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const isProduction = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const buildRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

export const authRateLimiter = buildRateLimiter(
  15 * 60 * 1000,
  parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, isProduction ? 20 : 200),
  "Too many authentication attempts. Please try again in a few minutes."
);

export const apiRateLimiter = buildRateLimiter(
  parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, isProduction ? 15 * 60 * 1000 : 60 * 1000),
  parsePositiveInt(process.env.API_RATE_LIMIT_MAX, isProduction ? 3000 : 10000),
  "Too many requests. Please slow down and try again shortly."
);
