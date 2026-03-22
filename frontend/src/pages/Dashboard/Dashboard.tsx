import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "../RoleBoard.css";
import "./Dashboard.css";

type DashboardProps = {
  mode?: "shared" | "operator";
};

const Dashboard = ({ mode = "shared" }: DashboardProps) => {
  const navigate = useNavigate();
  const isOperatorView = mode === "operator";

  return (
    <div className="roleboard-container dashboard-roleboard">
      <Sidebar
        currentPath={isOperatorView ? "/operator-dashboard" : "/dashboard"}
        onNavigate={(path) => navigate(path)}
      />
      <div className="roleboard-content dashboard-roleboard-content">
        <Header title={isOperatorView ? "Operator Dashboard" : "Dashboard"} />
        <div className="dashboard-stage" />
      </div>
    </div>
  );
};

export default Dashboard;
