import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { EmployeeLogsPanel } from "../User Management/components/EmployeeLogsPanel";
import "./EmployeeLogs.css";

const EmployeeLogs = () => {
  const navigate = useNavigate();

  return (
    <div className="employee-logs-page-container">
      <Sidebar currentPath="/employee-logs" onNavigate={(path) => navigate(path)} />
      <div className="employee-logs-page-content">
        <Header title="Employee Logs" />
        <div className="employee-logs-page-shell">
          <EmployeeLogsPanel />
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogs;

