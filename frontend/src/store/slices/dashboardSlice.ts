import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DashboardDateRangePreset, DashboardRoleView } from "../../types/dashboard";

type DashboardFilters = {
  customer: string;
  machine: string;
  operator: string;
  programmer: string;
};

export type DashboardState = {
  activeView: DashboardRoleView;
  dateRange: DashboardDateRangePreset;
  customStartDate: string;
  customEndDate: string;
  filters: DashboardFilters;
};

const initialState: DashboardState = {
  activeView: "ADMIN",
  dateRange: "THIS_MONTH",
  customStartDate: "",
  customEndDate: "",
  filters: {
    customer: "",
    machine: "",
    operator: "",
    programmer: "",
  },
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardActiveView(state, action: PayloadAction<DashboardRoleView>) {
      state.activeView = action.payload;
    },
    setDashboardDateRange(state, action: PayloadAction<DashboardDateRangePreset>) {
      state.dateRange = action.payload;
    },
    setDashboardCustomStartDate(state, action: PayloadAction<string>) {
      state.customStartDate = action.payload;
    },
    setDashboardCustomEndDate(state, action: PayloadAction<string>) {
      state.customEndDate = action.payload;
    },
    setDashboardFilter(
      state,
      action: PayloadAction<{ key: keyof DashboardFilters; value: string }>
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },
    resetDashboardFilters(state) {
      state.filters = {
        customer: "",
        machine: "",
        operator: "",
        programmer: "",
      };
      state.dateRange = "THIS_MONTH";
      state.customStartDate = "";
      state.customEndDate = "";
    },
  },
});

export const {
  setDashboardActiveView,
  setDashboardDateRange,
  setDashboardCustomStartDate,
  setDashboardCustomEndDate,
  setDashboardFilter,
  resetDashboardFilters,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
