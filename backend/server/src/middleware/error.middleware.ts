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
  req: express.Request,
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

  // Handle common Prisma errors
  const error = err as any;
  const isPrismaError = error.code?.startsWith("P");

  if (isPrismaError) {
    console.error(`[Prisma Error ${error.code}] ${req.method} ${req.url}:`, error.message);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Record not found" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Unique constraint violation" });
    }
    return res.status(500).json({ message: "Database error occurred", code: error.code });
  }

  console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);
  res.status(500).json({ message: "Internal server error" });
};
