import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
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

// MongoDB connection
connectDB();

// Auth routes
app.use("/api/auth", authRoutes);

// ✅ API returns JSON
app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from backend" });
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
