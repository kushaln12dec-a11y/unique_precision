import { Router } from "express";
import Job from "../models/Job";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get operator jobs with filters
router.get("/jobs", async (req, res) => {
  try {
    const query: any = {};

    // Filters
    if (req.query.customer) {
      query.customer = { $regex: req.query.customer, $options: "i" };
    }
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching operator jobs:", error);
    res.status(500).json({ message: "Error fetching operator jobs" });
  }
});

// Get single operator job
router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching job" });
  }
});

// Get jobs by groupId
router.get("/jobs/group/:groupId", async (req, res) => {
  try {
    const jobs = await Job.find({ groupId: Number(req.params.groupId) }).sort({ createdAt: 1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Update operator job fields
router.put("/jobs/:id", async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    updateData.updatedAt = updatedAt;
    if (req.user && (req.user as any).fullName) {
      updateData.updatedBy = (req.user as any).fullName;
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
    console.error("Error updating operator job:", error);
    res.status(500).json({ message: "Error updating job" });
  }
});

// Capture operator input (POST)
router.post("/jobs/:id/capture-input", async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImage
    } = req.body;

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    const updateData: any = {
      startTime,
      endTime,
      machineHrs,
      machineNumber,
      opsName,
      idleTime,
      idleTimeDuration,
      lastImage,
      updatedAt
    };

    if (req.user && (req.user as any).fullName) {
      updateData.updatedBy = (req.user as any).fullName;
    }

    const job = await Job.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
    console.error("Error capturing operator input:", error);
    res.status(500).json({ message: "Error capturing operator input" });
  }
});

// Update multiple jobs (for bulk operations)
router.put("/jobs/bulk", async (req, res) => {
  try {
    const { jobIds, updateData } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ message: "jobIds array is required" });
    }

    // Add updatedBy and updatedAt
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const updatedAt = `${day} ${month} ${year} ${hours}:${minutes}`;

    const finalUpdateData = {
      ...updateData,
      updatedAt,
    };
    if (req.user && (req.user as any).fullName) {
      finalUpdateData.updatedBy = (req.user as any).fullName;
    }

    const result = await Job.updateMany(
      { _id: { $in: jobIds } },
      { $set: finalUpdateData }
    );

    res.json({
      message: "Jobs updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error("Error updating operator jobs:", error);
    res.status(500).json({ message: "Error updating jobs" });
  }
});

export default router;
