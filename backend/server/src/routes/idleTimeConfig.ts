import { Router } from "express";
import IdleTimeConfig from "../models/IdleTimeConfig";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all idle time configurations
router.get("/", async (req, res) => {
  try {
    const configs = await IdleTimeConfig.find().sort({ idleTimeType: 1 });
    res.json(configs);
  } catch (error: any) {
    console.error("Error fetching idle time configs:", error);
    res.status(500).json({ message: "Error fetching idle time configurations" });
  }
});

// Get single idle time configuration
router.get("/:type", async (req, res) => {
  try {
    const config = await IdleTimeConfig.findOne({ idleTimeType: req.params.type });
    if (!config) {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching idle time configuration" });
  }
});

// Create or update idle time configuration
router.post("/", async (req, res) => {
  try {
    const { idleTimeType, durationMinutes } = req.body;

    if (!idleTimeType || durationMinutes === undefined) {
      return res.status(400).json({ message: "idleTimeType and durationMinutes are required" });
    }

    const config = await IdleTimeConfig.findOneAndUpdate(
      { idleTimeType },
      { idleTimeType, durationMinutes },
      { upsert: true, new: true }
    );

    res.status(201).json(config);
  } catch (error: any) {
    console.error("Error creating/updating idle time config:", error);
    res.status(500).json({ message: "Error creating/updating idle time configuration" });
  }
});

// Update idle time configuration
router.put("/:type", async (req, res) => {
  try {
    const { durationMinutes } = req.body;

    if (durationMinutes === undefined) {
      return res.status(400).json({ message: "durationMinutes is required" });
    }

    const config = await IdleTimeConfig.findOneAndUpdate(
      { idleTimeType: req.params.type },
      { durationMinutes },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }

    res.json(config);
  } catch (error: any) {
    console.error("Error updating idle time config:", error);
    res.status(500).json({ message: "Error updating idle time configuration" });
  }
});

// Delete idle time configuration
router.delete("/:type", async (req, res) => {
  try {
    const config = await IdleTimeConfig.findOneAndDelete({ idleTimeType: req.params.type });
    
    if (!config) {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }

    res.json({ message: "Idle time configuration deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting idle time configuration" });
  }
});

export default router;
