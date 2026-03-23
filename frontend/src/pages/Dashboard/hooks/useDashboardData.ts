import { useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../../../services/dashboardApi";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  setDashboardActiveView,
} from "../../../store/slices/dashboardSlice";
import type { DashboardRoleView, DashboardSummaryResponse } from "../../../types/dashboard";
import { getUserRoleFromToken } from "../../../utils/auth";

const getDefaultViewForRole = (role: string | null): DashboardRoleView => {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "OPERATOR") return "OPERATOR";
  if (normalized === "PROGRAMMER") return "PROGRAMMER";
  if (normalized === "QC") return "QC";
  return "ADMIN";
};

export const useDashboardData = (forcedView?: DashboardRoleView) => {
  const dispatch = useAppDispatch();
  const dashboardState = useAppSelector((state) => state.dashboard);
  const userRole = getUserRoleFromToken();
  const defaultView = getDefaultViewForRole(userRole);
  const activeView = forcedView || dashboardState.activeView || defaultView;
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (forcedView) {
      dispatch(setDashboardActiveView(forcedView));
      return;
    }
    dispatch(setDashboardActiveView(defaultView));
  }, [defaultView, dispatch, forcedView]);

  useEffect(() => {
    let cancelled = false;

    const load = async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");
        const summary = await getDashboardSummary({
          view: activeView,
          range: dashboardState.dateRange,
          startDate: dashboardState.customStartDate || undefined,
          endDate: dashboardState.customEndDate || undefined,
          customer: dashboardState.filters.customer || undefined,
          machine: dashboardState.filters.machine || undefined,
          operator: dashboardState.filters.operator || undefined,
          programmer: dashboardState.filters.programmer || undefined,
        });
        if (!cancelled) {
          setData(summary);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError.message || "Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(true), 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    activeView,
    dashboardState.customEndDate,
    dashboardState.customStartDate,
    dashboardState.dateRange,
    dashboardState.filters.customer,
    dashboardState.filters.machine,
    dashboardState.filters.operator,
    dashboardState.filters.programmer,
  ]);

  const meta = useMemo(() => data?.meta ?? null, [data]);

  return {
    activeView,
    allowedViews: meta?.allowedViews ?? [activeView],
    data,
    meta,
    loading,
    refreshing,
    error,
    clearError: () => setError(""),
  };
};
