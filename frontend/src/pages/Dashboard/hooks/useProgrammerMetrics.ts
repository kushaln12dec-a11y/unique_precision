import { useMemo } from "react";
import type { DashboardSummaryResponse } from "../../../types/dashboard";

export const useProgrammerMetrics = (data: DashboardSummaryResponse | null) =>
  useMemo(() => data?.programmer ?? null, [data]);
