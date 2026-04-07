import { Router } from "express";
import * as jobController from "../controllers/job.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR", "QC"), jobController.getJobs);
router.get("/programmer", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER"), jobController.getProgrammerJobs);
router.get("/operator", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR"), jobController.getOperatorJobs);
router.get("/qc", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "QC"), jobController.getQcJobs);
router.get("/group/:groupId", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR", "QC"), jobController.getJobsByGroupId);
router.get("/:id", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR", "QC"), jobController.getJobById);
router.post("/", authorize("ADMIN", "PROGRAMMER"), jobController.createJob);
router.put("/:id", authorize("ADMIN", "PROGRAMMER"), jobController.updateJob);
router.put("/group/:groupId/qc-decision", authorize("ADMIN", "QC"), jobController.updateGroupQcDecision);
router.put("/group/:groupId/qc-report-close", authorize("ADMIN", "QC"), jobController.updateGroupQcReportClosed);
router.delete("/:id", authorize("ADMIN", "PROGRAMMER"), jobController.deleteJob);
router.delete("/group/:groupId", authorize("ADMIN", "PROGRAMMER"), jobController.deleteJobsByGroupId);

export default router;
