import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import Modal from "./Modal";
import { getUserDesignationFromToken, getUserDisplayNameFromToken, getUserEmpIdFromToken } from "../utils/auth";
import { useTheme } from "../theme/ThemeProvider";
import { resolveHeaderBreadcrumbs, type BreadcrumbItem } from "./headerBreadcrumbs";
import { useHeaderNotifications } from "./useHeaderNotifications";
import "./Header.css";

interface HeaderProps {
  title: string;
  onNavigate?: (path: string) => void;
  breadcrumbsOverride?: BreadcrumbItem[];
}

const Header = ({ title, onNavigate, breadcrumbsOverride }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const displayName = getUserDisplayNameFromToken();
  const empId = getUserEmpIdFromToken();
  const designation = getUserDesignationFromToken();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const breadcrumbs = useMemo(() => {
    return resolveHeaderBreadcrumbs({
      breadcrumbsOverride,
      pathname: location.pathname,
      title,
    });
  }, [breadcrumbsOverride, location.pathname, title]);

  const handleBreadcrumbClick = useCallback((path: string) => {
    if (!path) return;
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (path === location.pathname) return;
    navigate(path);
  }, [location.pathname, navigate, onNavigate]);

  const { notifications, unreadCount } = useHeaderNotifications({
    currentUserName: displayName || "",
    isActive: showNotificationsModal,
  });

  return (
    <>
      <div className="page-header">
        <div className="header-left">
          <nav className="breadcrumb">
            {breadcrumbs.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div key={`${item.path}-${item.label}`} className="breadcrumb-item-wrapper">
                  {isLast ? (
                    <span className="breadcrumb-item active" aria-current="page">
                      <Icon className="breadcrumb-icon" />
                      <span className="breadcrumb-label">{item.label}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="breadcrumb-item breadcrumb-button"
                      onClick={() => handleBreadcrumbClick(item.path)}
                    >
                      <Icon className="breadcrumb-icon" />
                      <span className="breadcrumb-label">{item.label}</span>
                    </button>
                  )}
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
            className={`header-notification-button ${unreadCount > 0 ? "has-alerts" : ""}`}
            onClick={() => setShowNotificationsModal(true)}
            title={unreadCount > 0 ? "Show notifications" : "No notifications"}
          >
            <span className="header-notification-icon-wrap" aria-hidden="true">
              <NotificationsActiveRoundedIcon fontSize="small" />
              {unreadCount > 0 ? (
                <>
                  <span className="header-notification-count">{unreadCount}</span>
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
          {notifications.length === 0 ? (
            <div className="header-notification-empty">
              <strong>No notifications</strong>
              <span>Assignment updates and completion alerts will appear here across the app.</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`header-notification-card ${notification.severity}`.trim()}
                onClick={() => {
                  if (!notification.navigatePath) return;
                  setShowNotificationsModal(false);
                  navigate(notification.navigatePath);
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && notification.navigatePath) {
                    event.preventDefault();
                    setShowNotificationsModal(false);
                    navigate(notification.navigatePath);
                  }
                }}
                role={notification.navigatePath ? "button" : undefined}
                tabIndex={notification.navigatePath ? 0 : -1}
              >
                <div className="header-notification-card-header">
                  <div className="header-notification-card-title">
                    <strong>{notification.title}</strong>
                    <span>{notification.subtitle}</span>
                  </div>
                  <span className={`header-notification-pill ${notification.severity}`.trim()}>
                    {notification.statusLabel}
                  </span>
                </div>
                <div className="header-notification-card-grid">
                  {notification.fields.map((field) => (
                    <div
                      key={`${notification.id}:${field.label}`}
                      className={`header-notification-meta ${field.wide ? "header-notification-meta-wide" : ""}`.trim()}
                    >
                      <span>{field.label}</span>
                      <strong>{field.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="header-notification-actions">
                  <button
                    type="button"
                    className="header-notification-open-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!notification.navigatePath) return;
                      setShowNotificationsModal(false);
                      navigate(notification.navigatePath);
                    }}
                  >
                    {notification.actionLabel}
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
