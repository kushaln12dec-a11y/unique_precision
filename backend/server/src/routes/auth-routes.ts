import { Router } from "express";
import { changePassword, login } from "../controllers/auth-controller";
import { authenticate } from "../middleware/auth-middleware";

const router = Router();

router.post("/login", login);
router.post("/change-password", authenticate, changePassword);

export default router;
