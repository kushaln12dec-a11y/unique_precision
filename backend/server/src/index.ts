import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import jobRoutes from "./routes/jobs";
import operatorRoutes from "./routes/operator";
import idleTimeConfigRoutes from "./routes/idleTimeConfig";
import { authMiddleware } from "./middleware/auth";
import { connectDB } from "./config/database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use("/api", limiter);

// Body parser with payload limit
app.use(express.json({ limit: "10mb" }));

// Error handling middleware for JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  next();
});

// MongoDB connection
connectDB();

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



// Protected route example
app.get("/api/protected", authMiddleware, (_req, res) => {
  res.json({ message: "Protected data" });
});

// Serve frontend
const clientPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(clientPath));

// Catch-all for React Router (non-API routes only)
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientPath, "index.html"));
  } else {
    next();
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "NOT SET - Login will fail!"}`);
  console.log(`MONGO_URI: ${process.env.MONGO_URI ? "Set" : "NOT SET"}`);
});
