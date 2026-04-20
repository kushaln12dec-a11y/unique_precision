import { useEffect, useMemo, useState } from "react";
import { getActiveOperatorRunLogs, getEmployeeLogs } from "../../../services/employeeLogsApi";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { JobEntry } from "../../../types/job";
import { getLogUserDisplayName } from "../../../utils/jobFormatting";
import { buildOperatorCompletionAlerts } from "../utils/completionAlerts";

export const useOperatorDashboardActivity = ({
  activeTab,
  operatorGridJobs,
}: {
  activeTab: "jobs" | "logs";
  operatorGridJobs: JobEntry[];
}) => {
  const [activeOperatorRuns, setActiveOperatorRuns] = useState<EmployeeLog[]>([]);
  const [operatorHistoryLogs, setOperatorHistoryLogs] = useState<EmployeeLog[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadOperatorHistory = async () => {
      try {
        const logs = await getEmployeeLogs({ role: "OPERATOR", limit: 500 });
        if (!isMounted) return;
        setOperatorHistoryLogs(logs.filter((log) => String(log.jobId || "").trim()));
      } catch {
        if (isMounted) setOperatorHistoryLogs([]);
      }
    };

    void loadOperatorHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadActiveRuns = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const logs = await getActiveOperatorRunLogs();
        if (!isMounted) return;
        setActiveOperatorRuns(logs.filter((log) => String(log.jobId || "").trim() && !log.endedAt));
      } catch {
        if (isMounted) setActiveOperatorRuns([]);
      }
    };

    void loadActiveRuns();
    if (activeTab !== "jobs") {
      return () => {
        isMounted = false;
      };
    }

    const intervalId = window.setInterval(() => {
      void loadActiveRuns();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeTab]);

  const activeRunsByJobId = useMemo(() => {
    const map = new Map<string, EmployeeLog>();
    activeOperatorRuns.forEach((log) => {
      const jobId = String(log.jobId || "").trim();
      if (!jobId) return;
      const existing = map.get(jobId);
      const nextStartedAt = new Date(String(log.startedAt || "")).getTime();
      const existingStartedAt = new Date(String(existing?.startedAt || "")).getTime();
      if (!existing || nextStartedAt >= existingStartedAt) map.set(jobId, log);
    });
    return map;
  }, [activeOperatorRuns]);

  const operatorHistoryByJobId = useMemo(() => {
    const map = new Map<string, string[]>();
    const sortedLogs = [...operatorHistoryLogs].sort((left, right) => {
      const leftTime = new Date(String(left.startedAt || left.createdAt || 0)).getTime();
      const rightTime = new Date(String(right.startedAt || right.createdAt || 0)).getTime();
      return leftTime - rightTime;
    });

    sortedLogs.forEach((log) => {
      const jobId = String(log.jobId || "").trim();
      const userName = getLogUserDisplayName(log.userName || "", log.userEmail || "", "").toUpperCase();
      if (!jobId || !userName) return;
      const existing = map.get(jobId) || [];
      if (!existing.includes(userName)) existing.push(userName);
      map.set(jobId, existing);
    });

    return map;
  }, [operatorHistoryLogs]);

  const completionAlerts = useMemo(
    () => buildOperatorCompletionAlerts(activeOperatorRuns, operatorGridJobs),
    [activeOperatorRuns, operatorGridJobs],
  );

  return {
    activeOperatorRuns,
    activeRunsByJobId,
    completionAlerts,
    operatorHistoryByJobId,
  };
};
