import { useMemo } from "react";
import type { DashboardSummaryResponse } from "../../../types/dashboard";

export const useAdminMetrics = (data: DashboardSummaryResponse | null) =>
  useMemo(() => data?.admin ?? null, [data]);
