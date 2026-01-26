import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "../RoleBoard.css";

const Inventory = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/inventory" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Inventory" />
        <div className="roleboard-body">
          <h3>Inventory view coming soon</h3>
          <p>Stock levels, material requests, and warehouse metrics will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
