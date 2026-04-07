import { useEffect, useMemo, useState } from 'react';
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
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import Modal from './Modal';
import { getUserDesignationFromToken, getUserDisplayNameFromToken, getUserEmpIdFromToken } from '../utils/auth';
import { useTheme } from '../theme/ThemeProvider';
import { getEmployeeLogs } from '../services/employeeLogsApi';
import { getOperatorJobsPage } from '../services/jobApi';
import { fetchAllPaginatedItems } from '../utils/paginationUtils';
import { formatMachineLabel } from '../utils/jobFormatting';
import type { JobEntry } from '../types/job';
import type { EmployeeLog } from '../types/employeeLog';
import { buildOperatorCompletionAlerts } from '../pages/Operator/utils/completionAlerts';
import './Header.css';

interface HeaderProps {
  title: string;
  onNavigate?: (path: string) => void;
  breadcrumbsOverride?: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const BREADCRUMB_MAP: Record<string, BreadcrumbItem[]> = {
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
  '/jobLogs': [
    { label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
    { label: 'Job Logs', path: '/jobLogs', icon: PeopleIcon },
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

const HEADER_ALERT_FETCH_PAGE_SIZE = 100;

const Header = ({ title, onNavigate, breadcrumbsOverride }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const displayName = getUserDisplayNameFromToken();
  const empId = getUserEmpIdFromToken();
  const designation = getUserDesignationFromToken();
  const [activeOperatorRuns, setActiveOperatorRuns] = useState<EmployeeLog[]>([]);
  const [operatorGridJobs, setOperatorGridJobs] = useState<JobEntry[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Handle dynamic routes for programmer
  let breadcrumbs = breadcrumbsOverride || BREADCRUMB_MAP[location.pathname];

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
        : BREADCRUMB_MAP['/dashboard'];
    }
  }

  const handleBreadcrumbClick = (path: string, isLast: boolean) => {
    if (!isLast) {
      if (onNavigate) onNavigate(path);
      else navigate(path);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadHeaderAlerts = async () => {
      try {
        const logs = await getEmployeeLogs({ role: "OPERATOR", status: "IN_PROGRESS", limit: 250 });
        if (!isMounted) return;
        const activeLogs = logs.filter((log) => String(log.jobId || "").trim());
        setActiveOperatorRuns(activeLogs);

        if (activeLogs.length === 0) {
          setOperatorGridJobs([]);
          return;
        }

        const jobs = await fetchAllPaginatedItems<JobEntry>(
          (offset, limit) => getOperatorJobsPage(undefined, "", "", "", "", { offset, limit }),
          HEADER_ALERT_FETCH_PAGE_SIZE
        );
        if (!isMounted) return;
        setOperatorGridJobs(jobs);
      } catch {
        if (!isMounted) return;
        setActiveOperatorRuns([]);
        setOperatorGridJobs([]);
      }
    };

    void loadHeaderAlerts();
    const intervalId = window.setInterval(() => {
      void loadHeaderAlerts();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const completionAlerts = useMemo(
    () => buildOperatorCompletionAlerts(activeOperatorRuns, operatorGridJobs),
    [activeOperatorRuns, operatorGridJobs]
  );

  return (
    <>
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
          <button
            type="button"
            className={`header-notification-button ${completionAlerts.length > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowNotificationsModal(true)}
            title={completionAlerts.length > 0 ? "Show notifications" : "No notifications"}
          >
            <span className="header-notification-icon-wrap" aria-hidden="true">
              <NotificationsActiveRoundedIcon fontSize="small" />
              {completionAlerts.length > 0 ? (
                <>
                  <span className="header-notification-count">{completionAlerts.length}</span>
                  <RadioButtonCheckedRoundedIcon className="header-notification-pulse" sx={{ fontSize: "0.46rem" }} />
                </>
              ) : null}
            </span>
            <span>Alerts</span>
          </button>
          <button
            type="button"
            className="theme-toggle-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <DarkModeRoundedIcon fontSize="small" />
            ) : (
              <LightModeRoundedIcon fontSize="small" />
            )}
            <span>{theme === "light" ? "Dark" : "Light"} Mode</span>
          </button>
          {(displayName || empId) && (
            <div className="user-pill" title={displayName || empId || undefined}>
              <span className="user-label">Logged in as</span>
              <span className="user-name">{displayName || empId || "USER"}</span>
              {empId && <span className="user-emp-id">{empId}</span>}
              {designation && <span className="user-designation">{designation}</span>}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title="Notifications"
        size="large"
        className="header-notification-modal"
      >
        <div className="header-notification-list">
          {completionAlerts.length === 0 ? (
            <div className="header-notification-empty">
              <strong>No active alerts</strong>
              <span>Jobs approaching completion or overdue will appear here on every screen.</span>
            </div>
          ) : (
            completionAlerts.map((alert) => (
              <article
                key={alert.alertId}
                className={`header-notification-card ${alert.severity}`.trim()}
                onClick={() => {
                  setShowNotificationsModal(false);
                  navigate(`/operator/viewpage?groupId=${encodeURIComponent(alert.groupId)}`);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setShowNotificationsModal(false);
                    navigate(`/operator/viewpage?groupId=${encodeURIComponent(alert.groupId)}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="header-notification-card-header">
                  <div className="header-notification-card-title">
                    <strong>{alert.jobRef || alert.customer || "Completion alert"}</strong>
                    <span>{formatMachineLabel(alert.machineNumber) || alert.machineNumber || "-"}</span>
                  </div>
                  <span className={`header-notification-pill ${alert.severity}`.trim()}>
                    {alert.statusLabel}
                  </span>
                </div>
                <div className="header-notification-card-grid">
                  <div className="header-notification-meta">
                    <span>Remaining</span>
                    <strong>{alert.remainingLabel}</strong>
                  </div>
                  <div className="header-notification-meta">
                    <span>Est. Time</span>
                    <strong>{alert.estimatedTime}</strong>
                  </div>
                  <div className="header-notification-meta">
                    <span>Qty</span>
                    <strong>{alert.quantityLabel}</strong>
                  </div>
                  <div className="header-notification-meta">
                    <span>Operator</span>
                    <strong>{alert.operatorName || "-"}</strong>
                  </div>
                  <div className="header-notification-meta header-notification-meta-wide">
                    <span>Description</span>
                    <strong>{alert.description || "-"}</strong>
                  </div>
                </div>
                <div className="header-notification-actions">
                  <button
                    type="button"
                    className="header-notification-open-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowNotificationsModal(false);
                      navigate(`/operator/viewpage?groupId=${encodeURIComponent(alert.groupId)}`);
                    }}
                  >
                    Open Job
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </Modal>
    </>
  );
};

export default Header;
