import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all idle time configurations
router.get("/", async (req, res) => {
  try {
    const configs = await prisma.idleTimeConfig.findMany({
      orderBy: { idleTimeType: "asc" },
    });
    res.json(configs.map((c) => ({ ...c, _id: c.id })));
  } catch (error: any) {
    console.error("Error fetching idle time configs:", error);
    res.status(500).json({ message: "Error fetching idle time configurations" });
  }
});

// Get single idle time configuration
router.get("/:type", async (req, res) => {
  try {
    const config = await prisma.idleTimeConfig.findUnique({
      where: { idleTimeType: req.params.type },
    });
    if (!config) {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }
    res.json({ ...config, _id: config.id });
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

    const config = await prisma.idleTimeConfig.upsert({
      where: { idleTimeType },
      update: { durationMinutes },
      create: { idleTimeType, durationMinutes },
    });

    res.status(201).json({ ...config, _id: config.id });
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

    const config = await prisma.idleTimeConfig.update({
      where: { idleTimeType: req.params.type },
      data: { durationMinutes },
    });

    res.json({ ...config, _id: config.id });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }
    console.error("Error updating idle time config:", error);
    res.status(500).json({ message: "Error updating idle time configuration" });
  }
});

// Delete idle time configuration
router.delete("/:type", async (req, res) => {
  try {
    try {
      await prisma.idleTimeConfig.delete({ where: { idleTimeType: req.params.type } });
      res.json({ message: "Idle time configuration deleted successfully" });
    } catch (deleteError) {
      return res.status(404).json({ message: "Idle time configuration not found" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting idle time configuration" });
  }
});

export default router;
