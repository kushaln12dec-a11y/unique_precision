import { useEffect, useMemo, useState } from "react";
import { getEmployeeLogs } from "../services/employeeLogsApi";
import { getOperatorJobsPage } from "../services/jobApi";
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
  shouldPoll,
}: {
  currentUserName: string;
  shouldPoll: boolean;
}) => {
  const [activeOperatorRuns, setActiveOperatorRuns] = useState<EmployeeLog[]>([]);
  const [operatorGridJobs, setOperatorGridJobs] = useState<JobEntry[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<EmployeeLog[]>([]);
  const [personalActivityLogs, setPersonalActivityLogs] = useState<EmployeeLog[]>([]);

  useEffect(() => {
    if (!shouldPoll) {
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
          getEmployeeLogs({ role: "OPERATOR", status: "IN_PROGRESS", limit: 250 }),
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
          (offset, limit) => getOperatorJobsPage(undefined, "", "", "", "", { offset, limit }),
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

    void loadHeaderNotifications();
    const intervalId = window.setInterval(() => {
      void loadHeaderNotifications();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [shouldPoll]);

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
