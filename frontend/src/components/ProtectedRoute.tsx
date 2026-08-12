import { Navigate } from "react-router-dom";
import type { ProtectedRouteProps } from "../types/route";
import {
  clearAuthSession,
  getDecodedTokenPayload,
  getUserRoleFromToken,
  isTokenExpired,
} from "../utils/auth";

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const payload = getDecodedTokenPayload();
  if (!payload || isTokenExpired(payload)) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = (getUserRoleFromToken() || "").toUpperCase();
    const allowed = allowedRoles.some((allowedRole) => allowedRole.toUpperCase() === role);
    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
