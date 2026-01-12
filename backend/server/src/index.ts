import express from "express";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB (already working)
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// API test
app.get("/api/hello", (_req, res) => {
  res.send("Hello from backend");
});

/**
 * ✅ SERVE FRONTEND
 */
const clientPath = path.join(__dirname, "../../frontend/dist");

app.use(express.static(clientPath));

// Catch-all handler: serve index.html for any non-API routes
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
