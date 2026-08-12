import { getUserRoleFromToken } from "./auth";

/** Default landing path after login / root redirect, by role. */
export const getHomePathForRole = (role?: string | null): string => {
  const normalized = String(role || "").trim().toUpperCase();
  switch (normalized) {
    case "OPERATOR":
      return "/operator";
    case "PROGRAMMER":
      return "/programmer";
    case "QC":
      return "/qc";
    case "ACCOUNTANT":
      return "/billed-jobs";
    case "ADMIN":
    default:
      return "/dashboard";
  }
};

export const getHomePathFromToken = (): string => getHomePathForRole(getUserRoleFromToken());
