import { authenticate } from "./auth.middleware";
import { authorize } from "./rbac.middleware";

// Preserve existing imports while the rest of the codebase migrates to the new names.
export const authMiddleware = authenticate;
export const adminMiddleware = authorize("ADMIN");
