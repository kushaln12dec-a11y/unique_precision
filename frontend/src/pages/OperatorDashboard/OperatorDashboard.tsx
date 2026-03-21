import { Navigate } from "react-router-dom";
import Dashboard from "../Dashboard/Dashboard";
import { getUserRoleFromToken } from "../../utils/auth";

const OperatorDashboard = () => {
  const role = (getUserRoleFromToken() || "").toUpperCase();
  if (role !== "OPERATOR") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Dashboard mode="operator" />;
};

export default OperatorDashboard;
