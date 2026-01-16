import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <Sidebar currentPath="/dashboard" onNavigate={handleNavigation} />
      
      <div className="dashboard-content">
        {/* Dashboard content will be added here */}
      </div>
    </div>
  );
};

export default Dashboard;