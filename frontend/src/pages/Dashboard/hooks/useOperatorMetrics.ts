import { useMemo } from "react";
import type { DashboardSummaryResponse } from "../../../types/dashboard";

export const useOperatorMetrics = (data: DashboardSummaryResponse | null) =>
  useMemo(() => data?.operator ?? null, [data]);
