import rateLimit from "express-rate-limit";

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
  20,
  "Too many authentication attempts. Please try again in a few minutes."
);

export const apiRateLimiter = buildRateLimiter(
  15 * 60 * 1000,
  600,
  "Too many requests. Please slow down and try again shortly."
);
