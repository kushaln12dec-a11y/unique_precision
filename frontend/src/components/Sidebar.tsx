import { useState } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { SidebarProps } from "../types/sidebar";
import "./Sidebar.css";

const Sidebar = ({ currentPath = "/dashboard", onNavigate }: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const menuItems = [
    { icon: DashboardIcon, label: "Dashboard", path: "/dashboard" },
    { icon: PeopleIcon, label: "User Management", path: "/users" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    if (onNavigate) {
      onNavigate("/login");
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <div className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        {isExpanded && <h2 className="sidebar-title">UNIQUE PRECISION</h2>}
        <button
          className="sidebar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={index}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onNavigate && onNavigate(item.path)}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="nav-icon" />
              {isExpanded && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="nav-item logout-item"
          onClick={handleLogout}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogoutIcon className="nav-icon" />
          {isExpanded && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
