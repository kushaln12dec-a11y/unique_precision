import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth-routes";
import userRoutes from "./routes/user-routes";
import jobRoutes from "./routes/job-routes";
import operatorRoutes from "./routes/operator-routes";
import idleTimeConfigRoutes from "./routes/idle-time-config-routes";
import employeeLogsRoutes from "./routes/employee-logs-routes";
import masterConfigRoutes from "./routes/master-config-routes";
import inspectionReportsRoutes from "./routes/inspection-reports-routes";
import uploadRoutes from "./routes/upload-routes";
import dashboardRoutes from "./routes/dashboard-routes";
import debugRoutes from "./routes/debug-routes";
import { authenticate } from "./middleware/auth-middleware";
import { errorHandler, jsonErrorHandler } from "./middleware/error-middleware";
import { apiRateLimiter, authRateLimiter } from "./middleware/rate-limit-middleware";

const compression = require("compression");
const morgan = require("morgan");

const app = express();

// Keep BigInt values serializable across Prisma responses.
app.set("json replacer", (_key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value
);
app.use((_req, res, next) => {
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = ((...args: any[]) => {
    if (!res.headersSent) {
      res.setHeader("x-server-time-ms", String(Date.now()));
    }
    return originalWriteHead.apply(res, args as any);
  }) as typeof res.writeHead;
  next();
});
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(jsonErrorHandler);

// Health check (always available)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Auth routes
app.use("/api/auth", authRateLimiter, authRoutes);

// General API rate limiting (health and auth stay lightweight and independent)
app.use("/api", apiRateLimiter);

// User routes
app.use("/api/users", userRoutes);

// Job routes
app.use("/api/jobs", jobRoutes);

// Operator routes
app.use("/api/operator", operatorRoutes);

// Idle time configuration routes
app.use("/api/idle-time-config", idleTimeConfigRoutes);

// Employee logs routes
app.use("/api/employee-logs", employeeLogsRoutes);

// Master config routes
app.use("/api/master-config", masterConfigRoutes);

// Inspection report routes
app.use("/api/inspection-reports", inspectionReportsRoutes);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

// Debug routes
app.use("/api/debug", debugRoutes);

// Upload routes
app.use("/api/upload", uploadRoutes);

// Protected route example
app.get("/api/protected", authenticate, (_req, res) => {
  res.json({ message: "Protected data" });
});

// Serve frontend if built assets exist
const clientPath = path.join(__dirname, "../../frontend/dist");
const indexPath = path.join(clientPath, "index.html");
const hasFrontend = fs.existsSync(indexPath);

if (hasFrontend) {
  app.use(express.static(clientPath));

  // Catch-all for React Router (non-API routes only)
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  app.get("/", (_req, res) => {
    res.send("API running");
  });
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
}

app.use(errorHandler);

export default app;
