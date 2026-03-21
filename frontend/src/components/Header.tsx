import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import { getUserDesignationFromToken, getUserDisplayNameFromToken } from '../utils/auth';
import './Header.css';

interface HeaderProps {
  title: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = getUserDisplayNameFromToken();
  const designation = getUserDesignationFromToken();

  // Define breadcrumb paths
  const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
    '/dashboard': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
    ],
    '/operator-dashboard': [
      { label: 'Operator Dashboard', path: '/operator-dashboard', icon: BuildIcon },
    ],
    '/programmer': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Programmer', path: '/programmer', icon: CodeIcon },
    ],
    '/programmer/newjob': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Programmer', path: '/programmer', icon: CodeIcon },
      {
        label: 'New Job',
        path: '/programmer/newjob',
        icon: AddCircleOutlineIcon,
      },
    ],
    '/programmer/clone': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Programmer', path: '/programmer', icon: CodeIcon },
      {
        label: 'Clone Job',
        path: '/programmer/clone',
        icon: AddCircleOutlineIcon,
      },
    ],
    '/operator': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Operator', path: '/operator', icon: BuildIcon },
    ],
    '/operator/viewpage': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Operator', path: '/operator', icon: BuildIcon },
      { label: 'Job Details', path: '/operator/viewpage', icon: BuildIcon },
    ],
    '/qc': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'QC', path: '/qc', icon: VerifiedUserIcon },
    ],
    '/qc/inspection-report': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'QC', path: '/qc', icon: VerifiedUserIcon },
      { label: 'Inspection Report', path: '/qc/inspection-report', icon: VerifiedUserIcon },
    ],
    '/inventory': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Inventory', path: '/inventory', icon: InventoryIcon },
    ],
    '/users': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'User Management', path: '/users', icon: PeopleIcon },
    ],
    '/job-logs': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      { label: 'Job Logs', path: '/job-logs', icon: PeopleIcon },
    ],
    '/admin-console': [
      { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
      {
        label: 'Admin Console',
        path: '/admin-console',
        icon: SettingsSuggestIcon,
      },
    ],
  };

  // Handle dynamic routes for programmer
  let breadcrumbs = breadcrumbMap[location.pathname];

  if (!breadcrumbs) {
    // Check for edit route: /programmer/edit/:groupId
    if (location.pathname.match(/^\/programmer\/edit\/[^/]+$/)) {
      breadcrumbs = [
        { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
        { label: 'Programmer', path: '/programmer', icon: CodeIcon },
        {
          label: 'Edit Job',
          path: location.pathname,
          icon: AddCircleOutlineIcon,
        },
      ];
    }
    else if (location.pathname.match(/^\/programmer\/clone\/[^/]+$/)) {
      breadcrumbs = [
        { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
        { label: 'Programmer', path: '/programmer', icon: CodeIcon },
        {
          label: 'Clone Job',
          path: location.pathname,
          icon: AddCircleOutlineIcon,
        },
      ];
    }
    // Fallback
    else {
      breadcrumbs = title
        ? [{ label: title, path: location.pathname, icon: DashboardIcon }]
        : breadcrumbMap['/dashboard'];
    }
  }

  const handleBreadcrumbClick = (path: string, isLast: boolean) => {
    if (!isLast) {
      navigate(path);
    }
  };

  return (
    <div className="page-header">
      <div className="header-left">
        <nav className="breadcrumb">
          {breadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={item.path} className="breadcrumb-item-wrapper">
                <div
                  className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                  onClick={() => handleBreadcrumbClick(item.path, isLast)}
                  role={!isLast ? 'button' : undefined}
                  tabIndex={!isLast ? 0 : undefined}
                >
                  <Icon className="breadcrumb-icon" />
                  <span className="breadcrumb-label">{item.label}</span>
                </div>
                {!isLast && (
                  <ChevronRightIcon className="breadcrumb-separator" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="header-right">
        {displayName && (
          <div className="user-pill" title={displayName}>
            <span className="user-label">Logged in as</span>
            <span className="user-name">{displayName}</span>
            {designation && <span className="user-designation">{designation}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
