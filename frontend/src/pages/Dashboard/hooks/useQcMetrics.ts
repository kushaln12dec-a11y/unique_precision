import { useMemo } from "react";
import type { DashboardSummaryResponse } from "../../../types/dashboard";

export const useQcMetrics = (data: DashboardSummaryResponse | null) =>
  useMemo(() => data?.qc ?? null, [data]);
