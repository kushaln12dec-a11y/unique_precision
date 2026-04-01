import DashboardIcon from '@mui/icons-material/Dashboard';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SidebarProps } from '../types/sidebar';
import { getUserRoleFromToken } from '../utils/auth';
import './Sidebar.css';

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRoleFromToken()?.toUpperCase();
  const dashboardPath = role === 'OPERATOR' ? '/operator-dashboard' : '/dashboard';
  const menuItems = [
    { icon: DashboardIcon, label: 'Dashboard', path: dashboardPath },
    { icon: CodeIcon, label: 'Programmer', path: '/programmer' },
    { icon: BuildIcon, label: 'Operator', path: '/operator' },
    { icon: VerifiedUserIcon, label: 'QC', path: '/qc' },
    {
      icon: SettingsSuggestIcon,
      label: 'Admin Console',
      path: '/admin-console',
    },
    { icon: InventoryIcon, label: 'Inventory', path: '/inventory' },
    { icon: PeopleIcon, label: 'User Management', path: '/users' },
    { icon: GroupsIcon, label: 'Job Logs', path: '/jobLogs' },
  ];
  const filteredMenuItems =
    role && role !== 'ADMIN'
      ? menuItems.filter(
          (item) =>
            item.path === dashboardPath ||
            item.label === 'Dashboard' ||
            item.label.toUpperCase() === role,
        )
      : menuItems;

  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    return path !== dashboardPath && location.pathname.startsWith(`${path}/`);
  };

  const handleNavigate = (path: string) => {
    if (location.pathname === path && !location.search) return;
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <div className="sidebar collapsed">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            src="/output-onlinepngtools.svg"
            alt="Unique Precision"
            className="logo-collapsed"
          />
          <div className="logo-expanded">
            <img
              src="/output-onlinepngtools.svg"
              alt="Unique Precision"
              className="logo-expanded-image"
            />
            <span className="sidebar-company-name" aria-label="Unique Precision">
              <span className="sidebar-company-name-line">Unique</span>
              <span className="sidebar-company-name-line">Precision</span>
            </span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredMenuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isPathActive(item.path);
          return (
            <button
              type="button"
              key={index}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
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
          type="button"
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
