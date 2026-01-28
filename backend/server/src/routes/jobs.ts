import { Router } from "express";
import Job from "../models/Job";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Convert ISO date (YYYY-MM-DD) to format used in database (DD MMM YYYY)
const formatDateForQuery = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// All routes require authentication
router.use(authMiddleware);

// Get all jobs with optional filters
router.get("/", async (req, res) => {
  try {
    const query: any = {};

    // Inline filters
    if (req.query.customer) {
      query.customer = { $regex: req.query.customer, $options: "i" };
    }
    if (req.query.refNumber) {
      query.refNumber = { $regex: req.query.refNumber, $options: "i" };
    }
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    // Number range filters
    const numberRangeFields = ["cut", "thickness", "qty", "rate", "totalHrs", "totalAmount"];
    numberRangeFields.forEach((field) => {
      if (req.query[`${field}_min`] !== undefined || req.query[`${field}_max`] !== undefined) {
        query[field] = {};
        if (req.query[`${field}_min`] !== undefined) {
          query[field].$gte = Number(req.query[`${field}_min`]);
        }
        if (req.query[`${field}_max`] !== undefined) {
          query[field].$lte = Number(req.query[`${field}_max`]);
        }
      }
    });

    // Exact match filters
    if (req.query.passLevel) {
      query.passLevel = req.query.passLevel;
    }
    if (req.query.setting) {
      query.setting = { $regex: req.query.setting, $options: "i" };
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    if (req.query.critical !== undefined) {
      query.critical = req.query.critical === "true";
    }
    if (req.query.pipFinish !== undefined) {
      query.pipFinish = req.query.pipFinish === "true";
    }
    if (req.query.sedm) {
      query.sedm = req.query.sedm;
    }

    // Date range filter for createdAt
    if (req.query.createdAt_min || req.query.createdAt_max) {
      query.createdAt = {};
      if (req.query.createdAt_min) {
        // Convert ISO date (YYYY-MM-DD) to database format (DD MMM YYYY)
        const minDate = formatDateForQuery(req.query.createdAt_min as string);
        query.createdAt.$gte = minDate;
      }
      if (req.query.createdAt_max) {
        const maxDate = formatDateForQuery(req.query.createdAt_max as string);
        query.createdAt.$lte = maxDate;
      }
    }

    // Sort by createdAt string (format: "DD MMM YYYY") - descending (newest first)
    const jobs = await Job.find(query).sort({ createdAt: -1 });
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
