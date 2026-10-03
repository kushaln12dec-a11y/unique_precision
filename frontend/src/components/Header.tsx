import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import NotificationsOffRoundedIcon from "@mui/icons-material/NotificationsOffRounded";
import Modal from "./Modal";
import ChangePasswordModal from "./ChangePasswordModal";
import { getUserDesignationFromToken, getUserDisplayNameFromToken, getUserEmpIdFromToken } from "../utils/auth";

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

  const displayName = getUserDisplayNameFromToken();
  const empId = getUserEmpIdFromToken();
  const designation = getUserDesignationFromToken();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"ALL" | "WARNING" | "DANGER" | "INFO">("ALL");

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
    isActive: true,
  });

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "ALL") return notifications;
    if (notificationFilter === "WARNING") return notifications.filter((n) => n.severity === "warning");
    if (notificationFilter === "DANGER") return notifications.filter((n) => n.severity === "danger");
    if (notificationFilter === "INFO") return notifications.filter((n) => n.severity === "info");
    return notifications;
  }, [notifications, notificationFilter]);

  const warningCount = useMemo(() => notifications.filter((n) => n.severity === "warning").length, [notifications]);
  const dangerCount = useMemo(() => notifications.filter((n) => n.severity === "danger").length, [notifications]);
  const infoCount = useMemo(() => notifications.filter((n) => n.severity === "info").length, [notifications]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "danger":
        return <ErrorOutlineRoundedIcon className="notification-type-icon danger" />;
      case "warning":
        return <WarningRoundedIcon className="notification-type-icon warning" />;
      case "info":
        return <InfoRoundedIcon className="notification-type-icon info" />;
      default:
        return <CheckCircleRoundedIcon className="notification-type-icon success" />;
    }
  };

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

          {(displayName || empId) && (
            <button
              type="button"
              className="user-pill user-pill-button"
              title="Change password"
              onClick={() => setShowChangePasswordModal(true)}
            >
              <span className="user-label">Logged in as</span>
              <span className="user-name">{displayName || empId || "USER"}</span>
              {empId && <span className="user-emp-id">{empId}</span>}
              {designation && <span className="user-designation">{designation}</span>}
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title="Notifications & Alerts"
        size="large"
        className="header-notification-modal"
      >
        <div className="header-notification-container">
          {/* Header Bar with Filter Badges */}
          <div className="header-notification-filter-bar">
            <button
              type="button"
              className={`header-notification-filter-btn ${notificationFilter === "ALL" ? "active" : ""}`}
              onClick={() => setNotificationFilter("ALL")}
            >
              All <span className="filter-count">{notifications.length}</span>
            </button>
            {warningCount > 0 && (
              <button
                type="button"
                className={`header-notification-filter-btn warning ${notificationFilter === "WARNING" ? "active" : ""}`}
                onClick={() => setNotificationFilter("WARNING")}
              >
                <WarningRoundedIcon style={{ fontSize: "0.85rem" }} /> Warnings <span className="filter-count">{warningCount}</span>
              </button>
            )}
            {dangerCount > 0 && (
              <button
                type="button"
                className={`header-notification-filter-btn danger ${notificationFilter === "DANGER" ? "active" : ""}`}
                onClick={() => setNotificationFilter("DANGER")}
              >
                <ErrorOutlineRoundedIcon style={{ fontSize: "0.85rem" }} /> Critical <span className="filter-count">{dangerCount}</span>
              </button>
            )}
            {infoCount > 0 && (
              <button
                type="button"
                className={`header-notification-filter-btn info ${notificationFilter === "INFO" ? "active" : ""}`}
                onClick={() => setNotificationFilter("INFO")}
              >
                <InfoRoundedIcon style={{ fontSize: "0.85rem" }} /> Info <span className="filter-count">{infoCount}</span>
              </button>
            )}
          </div>

          <div className="header-notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="header-notification-empty">
                <div className="header-notification-empty-icon">
                  <NotificationsOffRoundedIcon fontSize="large" />
                </div>
                <strong>No {notificationFilter !== "ALL" ? notificationFilter.toLowerCase() : ""} notifications</strong>
                <span>Assignment updates, operator activity alerts, and completion notifications will appear here.</span>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
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
                    <div className="header-notification-title-wrap">
                      <div className="header-notification-icon-badge">
                        {getSeverityIcon(notification.severity)}
                      </div>
                      <div className="header-notification-card-title">
                        <strong>{notification.title}</strong>
                        {notification.subtitle && <span>{notification.subtitle}</span>}
                      </div>
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
                        <span className="meta-label">{field.label}</span>
                        <strong className="meta-value">{field.value}</strong>
                      </div>
                    ))}
                  </div>

                  {notification.navigatePath && (
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
                        <ArrowForwardRoundedIcon style={{ fontSize: "0.85rem", marginLeft: "0.25rem" }} />
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </>
  );
};

export default Header;
