import type { DashboardDateRangePreset } from "../../../types/dashboard";

export const DASHBOARD_DATE_RANGE_OPTIONS: Array<{
  value: DashboardDateRangePreset;
  label: string;
}> = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "YTD", label: "YTD" },
  { value: "CUSTOM", label: "Custom" },
];
