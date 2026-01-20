import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";
import type { SidebarProps } from "../types/sidebar";
import "./Sidebar.css";

const Sidebar = ({ currentPath = "/dashboard", onNavigate }: SidebarProps) => {
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
    <div className="sidebar collapsed">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo-cropped.svg" alt="Unique Precision" className="logo-collapsed" />
          <img src="/logo.svg" alt="Unique Precision" className="logo-expanded" />
        </div>
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
              title={item.label}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="nav-item logout-item"
          onClick={handleLogout}
          title="Logout"
        >
          <LogoutIcon className="nav-icon" />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
