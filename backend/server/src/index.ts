import express from "express";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// ✅ API returns JSON
app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from backend" });
});

// Serve frontend
const clientPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(clientPath));

// Catch-all for React Router (non-API routes only)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientPath, "index.html"));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
