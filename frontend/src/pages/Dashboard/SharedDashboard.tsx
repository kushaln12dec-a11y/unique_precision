import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import { getUserRoleFromToken } from "../../utils/auth";

const SharedDashboard = () => {
  const role = (getUserRoleFromToken() || "").toUpperCase();
  if (role === "OPERATOR") {
    return <Navigate to="/operator-dashboard" replace />;
  }
  return <Dashboard mode="shared" />;
};

export default SharedDashboard;
