import express from "express";
import { ZodError } from "zod";
import { isHttpError } from "../lib/httpError";

export const jsonErrorHandler = (
  err: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  next(err);
};

export const errorHandler = (
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (isHttpError(err)) {
    return res.status((err as any).statusCode).json({ message: (err as Error).message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
};
