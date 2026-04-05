import { useEffect, useState } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SidebarProps } from '../types/sidebar';
import { getUserRoleFromToken } from '../utils/auth';
import './Sidebar.css';

const Sidebar = ({ onNavigate, className = "" }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isTabletOpen, setIsTabletOpen] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false
  );
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const updateViewport = (matches: boolean) => {
      setIsTabletViewport(matches);
      if (!matches) {
        setIsTabletOpen(false);
      }
    };

    updateViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateViewport(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
    setIsTabletOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsTabletOpen(false);
    navigate('/login', { replace: true });
  };

  const handleTabletToggle = () => {
    if (!isTabletViewport) return;
    setIsTabletOpen((prev) => !prev);
  };

  return (
    <>
      <div className={`sidebar ${isTabletOpen ? 'expanded tablet-open' : 'collapsed'} ${className}`.trim()}>
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-logo"
          onClick={handleTabletToggle}
          aria-label={isTabletViewport ? (isTabletOpen ? "Close navigation" : "Open navigation") : undefined}
          title={undefined}
        >
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
          <span className="sidebar-toggle-icon" aria-hidden="true">
            <MenuOpenRoundedIcon />
          </span>
        </button>
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
      {isTabletOpen ? <button type="button" className="sidebar-tablet-backdrop" aria-label="Close navigation" onClick={() => setIsTabletOpen(false)} /> : null}
    </>
  );
};

export default Sidebar;
