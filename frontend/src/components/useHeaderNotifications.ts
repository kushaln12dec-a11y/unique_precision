import { useEffect, useMemo, useState } from "react";
import { getActiveOperatorRunLogs, getEmployeeLogs } from "../services/employeeLogsApi";
import { getOperatorJobsPage } from "../services/operatorApi";
import { useJobSync } from "../hooks/useJobSync";
import type { EmployeeLog } from "../types/employeeLog";
import type { JobEntry } from "../types/job";
import { fetchAllPaginatedItems } from "../utils/paginationUtils";
import {
  buildAssignmentNotificationItems,
  buildCompletionNotificationItems,
  buildPersonalActivityNotificationItems,
  type HeaderNotificationItem,
} from "./headerNotificationUtils";

const HEADER_ALERT_FETCH_PAGE_SIZE = 100;

export const useHeaderNotifications = ({
  currentUserName,
  isActive,
}: {
  currentUserName: string;
  isActive: boolean;
}) => {
  const [activeOperatorRuns, setActiveOperatorRuns] = useState<EmployeeLog[]>([]);
  const [operatorGridJobs, setOperatorGridJobs] = useState<JobEntry[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<EmployeeLog[]>([]);
  const [personalActivityLogs, setPersonalActivityLogs] = useState<EmployeeLog[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useJobSync(() => {
    setRefreshKey((value) => value + 1);
  }, isActive);

  useEffect(() => {
    if (!isActive) {
      setActiveOperatorRuns([]);
      setOperatorGridJobs([]);
      setAssignmentLogs([]);
      setPersonalActivityLogs([]);
      return;
    }

    let isMounted = true;

    const loadHeaderNotifications = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const [activeLogs, assignmentUpdates, activityUpdates] = await Promise.all([
          getActiveOperatorRunLogs(),
          getEmployeeLogs({ role: "OPERATOR", activityType: "OPERATOR_ASSIGNMENT", limit: 100 }),
          getEmployeeLogs({ role: "OPERATOR", activityType: "OPERATOR_PRODUCTION", limit: 100 }),
        ]);
        if (!isMounted) return;

        const runningLogs = activeLogs.filter((log) => String(log.jobId || "").trim());
        setActiveOperatorRuns(runningLogs);
        setAssignmentLogs(assignmentUpdates);
        setPersonalActivityLogs(activityUpdates);

        if (runningLogs.length === 0) {
          setOperatorGridJobs([]);
          return;
        }

        const jobs = await fetchAllPaginatedItems<JobEntry>(
          (offset, limit) => getOperatorJobsPage(undefined, undefined, undefined, { offset, limit }),
          HEADER_ALERT_FETCH_PAGE_SIZE,
        );
        if (!isMounted) return;
        setOperatorGridJobs(jobs);
      } catch {
        if (!isMounted) return;
        setActiveOperatorRuns([]);
        setOperatorGridJobs([]);
        setAssignmentLogs([]);
        setPersonalActivityLogs([]);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadHeaderNotifications();
      }
    };

    void loadHeaderNotifications();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, refreshKey]);

  const notifications = useMemo<HeaderNotificationItem[]>(() => {
    const assignmentItems = buildAssignmentNotificationItems({
      logs: assignmentLogs,
      currentUserName,
    });
    const personalActivityItems = buildPersonalActivityNotificationItems({
      logs: personalActivityLogs,
      currentUserName,
    });
    const completionItems = buildCompletionNotificationItems(activeOperatorRuns, operatorGridJobs);
    return [...assignmentItems, ...personalActivityItems, ...completionItems]
      .sort((left, right) => new Date(right.createdAtLabel || 0).getTime() - new Date(left.createdAtLabel || 0).getTime());
  }, [activeOperatorRuns, assignmentLogs, currentUserName, operatorGridJobs, personalActivityLogs]);

  return {
    notifications,
    unreadCount: notifications.length,
  };
};
