import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Sidebar from "../../components/Sidebar";
import Toast from "../../components/Toast";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  resetDashboardFilters,
  setDashboardActiveView,
  setDashboardCustomEndDate,
  setDashboardCustomStartDate,
  setDashboardDateRange,
  setDashboardFilter,
} from "../../store/slices/dashboardSlice";
import type { DashboardRoleView } from "../../types/dashboard";
import { getUserRoleFromToken } from "../../utils/auth";
import AdminDashboard from "./AdminDashboard";
import DashboardFilters from "./components/DashboardFilters";
import RoleViewSwitcher from "./components/RoleViewSwitcher";
import OperatorDashboardView from "./OperatorDashboard";
import ProgrammerDashboard from "./ProgrammerDashboard";
import QcDashboard from "./QcDashboard";
import { useDashboardData } from "./hooks/useDashboardData";
import { useAdminMetrics } from "./hooks/useAdminMetrics";
import { useOperatorMetrics } from "./hooks/useOperatorMetrics";
import { useProgrammerMetrics } from "./hooks/useProgrammerMetrics";
import { useQcMetrics } from "./hooks/useQcMetrics";
import "../RoleBoard.css";
import "./styles/Dashboard.css";
import "./styles/cards.css";
import "./styles/animations.css";

type DashboardProps = {
  mode?: "shared" | "operator";
};

const Dashboard = ({ mode = "shared" }: DashboardProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const dashboardState = useAppSelector((state) => state.dashboard);
  const isOperatorRoute = mode === "operator";
  const forcedView: DashboardRoleView | undefined = isOperatorRoute ? "OPERATOR" : undefined;
  const { activeView, allowedViews, data, meta, loading, refreshing, error, clearError } = useDashboardData(forcedView);
  const adminData = useAdminMetrics(data);
  const operatorData = useOperatorMetrics(data);
  const programmerData = useProgrammerMetrics(data);
  const qcData = useQcMetrics(data);
  const userRole = String(getUserRoleFromToken() || "").toUpperCase();

  useEffect(() => {
    if (!data?.meta) return;
    if (!data.meta.allowedViews.includes(activeView)) {
      dispatch(setDashboardActiveView(data.meta.allowedViews[0]));
    }
  }, [activeView, data?.meta, dispatch]);

  const renderDashboard = () => {
    if (!data) return null;
    if (activeView === "OPERATOR" && operatorData) {
      return (
        <OperatorDashboardView
          data={operatorData}
          onOpenOperatorJob={(groupId) => navigate(`/operator/viewpage?groupId=${groupId}`)}
        />
      );
    }
    if (activeView === "PROGRAMMER" && programmerData) {
      return <ProgrammerDashboard data={programmerData} />;
    }
    if (activeView === "QC" && qcData) {
      return <QcDashboard data={qcData} />;
    }
    return adminData ? <AdminDashboard data={adminData} /> : null;
  };

  return (
    <div className="roleboard-container dashboard-roleboard">
      <Sidebar
        currentPath={isOperatorRoute ? "/operator-dashboard" : "/dashboard"}
        onNavigate={(path) => navigate(path)}
      />
      <div className="roleboard-content dashboard-shell">
        <div className="dashboard-page-shell">
          <section className="dashboard-command-bar">
            <div>
              <span className="dashboard-section-eyebrow">Neon Operations Board</span>
              <h1>{userRole === "ADMIN" ? "Universal Control Dashboard" : `${activeView} Dashboard`}</h1>
              <p>
                Switch perspectives, filter the live factory pulse, and monitor revenue, throughput, and QC pressure from one surface.
              </p>
            </div>
            <div className="dashboard-command-side">
              <div className={`dashboard-live-pill ${refreshing ? "refreshing" : ""}`}>
                <i />
                <span>{refreshing ? "Refreshing..." : "Live metrics"}</span>
              </div>
              <div className="dashboard-updated-card">
                <span>Last updated</span>
                <strong>{meta?.generatedAt ? new Date(meta.generatedAt).toLocaleTimeString("en-IN") : "--:--"}</strong>
              </div>
              <button
                type="button"
                className="dashboard-chip-button"
                onClick={() => window.location.reload()}
              >
                <RefreshRoundedIcon sx={{ fontSize: "1rem" }} />
                Reload
              </button>
            </div>
          </section>

          {allowedViews.length > 1 ? (
            <RoleViewSwitcher
              activeView={activeView}
              allowedViews={allowedViews}
              onChange={(view) => dispatch(setDashboardActiveView(view))}
            />
          ) : null}

          <DashboardFilters
            range={dashboardState.dateRange}
            customStartDate={dashboardState.customStartDate}
            customEndDate={dashboardState.customEndDate}
            filters={dashboardState.filters}
            options={meta?.filterOptions ?? { customers: [], machines: [], operators: [], programmers: [] }}
            onRangeChange={(value) => dispatch(setDashboardDateRange(value))}
            onCustomStartDateChange={(value) => dispatch(setDashboardCustomStartDate(value))}
            onCustomEndDateChange={(value) => dispatch(setDashboardCustomEndDate(value))}
            onFilterChange={(key, value) => dispatch(setDashboardFilter({ key, value }))}
            onReset={() => dispatch(resetDashboardFilters())}
          />

          {loading ? (
            <div className="dashboard-skeleton-layout">
              <div className="dashboard-skeleton-card wide" />
              <div className="dashboard-skeleton-card" />
              <div className="dashboard-skeleton-card" />
              <div className="dashboard-skeleton-card" />
              <div className="dashboard-skeleton-card tall" />
              <div className="dashboard-skeleton-card tall" />
            </div>
          ) : (
            renderDashboard()
          )}
        </div>
      </div>

      <Toast
        message={error}
        visible={Boolean(error)}
        variant="error"
        onClose={clearError}
      />
    </div>
  );
};

export default Dashboard;
