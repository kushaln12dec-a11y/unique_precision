import { Router } from "express";
import Job from "../models/Job";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all jobs
router.get("/", async (req, res) => {
  try {
    // Sort by createdAt string (format: "DD MMM YYYY") - descending (newest first)
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Get jobs by groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    const jobs = await Job.find({ groupId: Number(req.params.groupId) }).sort({ createdAt: 1 });
    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs by groupId:", error);
    res.status(500).json({ message: "Error fetching jobs" });
  }
});

// Get single job
router.get("/:id", async (req, res) => {
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

// Create job(s) - accepts single job or array of jobs
router.post("/", async (req, res) => {
  try {
    const jobsData = Array.isArray(req.body) ? req.body : [req.body];
    
    // Remove id field from each job (MongoDB will generate _id automatically)
    const cleanedJobsData = jobsData.map((job: any) => {
      const { id, ...jobWithoutId } = job;
      return jobWithoutId;
    });
    
    const jobs = await Job.insertMany(cleanedJobsData);
    res.status(201).json(Array.isArray(req.body) ? jobs : jobs[0]);
  } catch (error: any) {
    console.error("Error creating job(s):", error);
    res.status(500).json({ 
      message: "Error creating job(s)",
      error: error.message || String(error)
    });
  }
});

// Update job
router.put("/:id", async (req, res) => {
  try {
    // Remove id field if present (shouldn't update MongoDB _id)
    const { id, ...updateData } = req.body;
    
    const job = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error: any) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Error updating job" });
  }
});

// Delete job
router.delete("/:id", async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting job" });
  }
});

// Delete all jobs by groupId
router.delete("/group/:groupId", async (req, res) => {
  try {
    const result = await Job.deleteMany({ groupId: Number(req.params.groupId) });
    
    res.json({ 
      message: "Jobs deleted successfully",
      deletedCount: result.deletedCount 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting jobs" });
  }
});

export default router;
