import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import jobRoutes from "./routes/jobs";
import operatorRoutes from "./routes/operator";
import idleTimeConfigRoutes from "./routes/idleTimeConfig";
import employeeLogsRoutes from "./routes/employeeLogs";
import masterConfigRoutes from "./routes/masterConfig";
import inspectionReportsRoutes from "./routes/inspectionReports";
import { authMiddleware } from "./middleware/auth";

const app = express();

// CORS (allow all origins for now; tighten in production if needed)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security headers
app.use(helmet());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use("/api", limiter);

// Body parser with payload limit
app.use(express.json({ limit: "10mb" }));

// Error handling middleware for JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  next();
});

// Auth routes
app.use("/api/auth", authRoutes);

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

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
