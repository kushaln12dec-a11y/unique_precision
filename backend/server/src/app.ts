import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import jobRoutes from "./routes/jobs";
import operatorRoutes from "./routes/operator";
import idleTimeConfigRoutes from "./routes/idleTimeConfig";
import employeeLogsRoutes from "./routes/employeeLogs";
import masterConfigRoutes from "./routes/masterConfig";
import inspectionReportsRoutes from "./routes/inspectionReports";
import uploadRoutes from "./routes/upload";
import dashboardRoutes from "./routes/dashboard";
import debugRoutes from "./routes/debug";
import { authMiddleware } from "./middleware/auth";
import { errorHandler, jsonErrorHandler } from "./middleware/error.middleware";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimit.middleware";

const compression = require("compression");
const morgan = require("morgan");

const app = express();

// Keep BigInt values serializable across Prisma responses.
app.set("json replacer", (_key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value
);
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
app.get("/api/protected", authMiddleware, (_req, res) => {
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
