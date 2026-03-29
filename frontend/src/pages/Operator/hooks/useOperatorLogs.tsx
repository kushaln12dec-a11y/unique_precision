import { useCallback, useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { JobEntry } from "../../../types/job";
import { formatDisplayDateTime } from "../../../utils/date";
import {
  formatMachineLabel,
  getEmailLocalPart,
  getLogUserDisplayName,
  toMachineIndex,
} from "../../../utils/jobFormatting";
import { fetchAllPaginatedItems } from "../../../utils/paginationUtils";
import { getEmployeeLogsPage } from "../../../services/employeeLogsApi";
import {
  formatOperatorDuration,
  formatOperatorLogStatus,
  formatOperatorWorkItem,
  getOperatorShiftLabel,
  OPERATOR_LOG_SEARCH_FETCH_PAGE_SIZE,
} from "../utils/operatorLogHelpers";
import { buildOperatorLogColumnDefs, buildOperatorLogFilter, buildOperatorLogsColumns } from "../utils/operatorLogsUtils";

type Params = {
  jobs: JobEntry[];
  users: Array<{ firstName?: string | null; lastName?: string | null; email: string; role?: string | null }>;
  machineOptionsForDropdown: string[];
  isAdmin: boolean;
  operatorLogSearch: string;
  operatorLogStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  operatorLogMachine: string;
  setToast: React.Dispatch<
    React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
  >;
};

export const useOperatorLogs = ({
  jobs,
  users,
  machineOptionsForDropdown,
  isAdmin,
  operatorLogSearch,
  operatorLogStatus,
  operatorLogMachine,
  setToast,
}: Params) => {
  const designationByUserName = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      const firstName = String(u.firstName || "").trim();
      const emailLocalPart = getEmailLocalPart(u.email);
      const role = String(u.role || "").toUpperCase();
      const designation = role === "ADMIN" ? "Admin" : role === "OPERATOR" ? "Operator" : role;
      if (fullName) map.set(fullName.toLowerCase(), designation);
      if (firstName) map.set(firstName.toLowerCase(), designation);
      if (emailLocalPart) map.set(emailLocalPart.toLowerCase(), designation);
    });
    return map;
  }, [users]);

  const groupWedmByGroupId = useMemo(() => {
    const map = new Map<string, number>();
    const groups = new Map<string, JobEntry[]>();
    jobs.forEach((entry) => {
      const key = String(entry.groupId ?? entry.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    groups.forEach((entries, groupId) => {
      const wedm = entries.reduce((sum, entry) => sum + Number(entry.totalHrs || 0) * Number(entry.rate || 0), 0);
      map.set(groupId, wedm);
    });
    return map;
  }, [jobs]);

  const getWorkedSecondsForLog = useCallback((log: EmployeeLog): number => {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const machineHrs = Number(metadata.machineHrs || 0);
    if (Number.isFinite(machineHrs) && machineHrs > 0) return Math.max(0, Math.round(machineHrs * 3600));
    return Math.max(0, Number(log.durationSeconds || 0));
  }, []);

  const calculateWorkedSecondsByLogs = useCallback(
    (logs: EmployeeLog[]) => {
      const map = new Map<string, number>();
      logs.forEach((log) => {
        const groupId = String(log.jobGroupId || "").trim();
        if (!groupId || String(log.role || "").toUpperCase() !== "OPERATOR") return;
        const workedSeconds = getWorkedSecondsForLog(log);
        map.set(groupId, (map.get(groupId) || 0) + workedSeconds);
      });
      return map;
    },
    [getWorkedSecondsForLog]
  );

  const getMachineNumberForLog = useCallback(
    (log: EmployeeLog): string => {
      const machineFromMeta = String((log.metadata as any)?.machineNumber || "").trim();
      if (machineFromMeta) return toMachineIndex(machineFromMeta);
      const groupId = String(log.jobGroupId || "").trim();
      if (!groupId) return "-";
      const groupEntries = jobs.filter((entry) => String(entry.groupId) === groupId);
      if (!groupEntries.length) return "-";
      const firstMachine = String(
        groupEntries.find((entry) => String(entry.machineNumber || "").trim())?.machineNumber || ""
      ).trim();
      return toMachineIndex(firstMachine) || "-";
    },
    [jobs]
  );

  const getRevenueForLog = useCallback(
    (log: EmployeeLog, workedSecondsMap: Map<string, number> = new Map<string, number>()) => {
      const metadata = (log.metadata || {}) as Record<string, any>;
      const explicitRevenue = log.revenue ?? metadata.revenue;
      if (explicitRevenue !== undefined && explicitRevenue !== null && String(explicitRevenue).trim() !== "") {
        const numericValue = Number(explicitRevenue);
        if (Number.isFinite(numericValue)) return `Rs. ${Math.round(numericValue)}`;
        return String(explicitRevenue);
      }

      const groupId = String(log.jobGroupId || "").trim();
      const wedm = groupId ? groupWedmByGroupId.get(groupId) || 0 : 0;
      if (!wedm) return "-";
      const totalWorkedSeconds = workedSecondsMap.get(groupId) || 0;
      if (!totalWorkedSeconds) return `Rs. ${Math.round(wedm)}`;
      const workedSeconds = getWorkedSecondsForLog(log);
      return `Rs. ${Math.round(wedm * (Math.max(0, workedSeconds) / totalWorkedSeconds))}`;
    },
    [getWorkedSecondsForLog, groupWedmByGroupId]
  );

  const machineFilterOptions = machineOptionsForDropdown;

  const logsColumns = useMemo<Column<EmployeeLog>[]>(() => buildOperatorLogsColumns({
    designationByUserName,
    getMachineNumberForLog,
    getRevenueForLog,
    isAdmin,
  }), [designationByUserName, getMachineNumberForLog, getRevenueForLog, isAdmin]);

  const filterOperatorLogs = useMemo(
    () =>
      buildOperatorLogFilter({
        designationByUserName,
        getMachineNumberForLog,
        getRevenueForLog,
        isAdmin,
        operatorLogSearch,
      }),
    [designationByUserName, getMachineNumberForLog, getRevenueForLog, isAdmin, operatorLogSearch]
  );

  const hasOperatorLogSearch = operatorLogSearch.trim().length > 0;

  const handleExportOperatorLogsCsv = useCallback(() => {
    void (async () => {
      const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
        async (offset, limit) => {
          const page = await getEmployeeLogsPage({
            role: "OPERATOR",
            status: operatorLogStatus || undefined,
            machine: operatorLogMachine || undefined,
            offset,
            limit,
          });
          return { items: page.items, hasMore: page.hasMore };
        },
        OPERATOR_LOG_SEARCH_FETCH_PAGE_SIZE
      );
      const filteredLogs = filterOperatorLogs(allLogs);
      const workedSecondsMap = calculateWorkedSecondsByLogs(filteredLogs);
      const headers = ["User", "MACH #", "Job Ref", "Description", "Summary", "Started at", "Ended at", "Shift", "Duration", "Estimated", "Overtime", "Idle Time", "Remark", "Status"];
      if (isAdmin) headers.splice(headers.length - 1, 0, "Revenue");
      const rows = filteredLogs.map((row) => {
        const name = getLogUserDisplayName(row.userName, row.userEmail, "");
        const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
        return [
          name ? `${name} (${designation})` : designation,
          formatMachineLabel(getMachineNumberForLog(row)),
          formatOperatorWorkItem(row.workItemTitle),
          row.jobDescription || "",
          row.workSummary || "",
          formatDisplayDateTime(row.startedAt),
          formatDisplayDateTime(row.endedAt || null),
          getOperatorShiftLabel(row.startedAt),
          formatOperatorDuration(row.durationSeconds),
          formatOperatorDuration(Number((row.metadata as any)?.estimatedSeconds || 0)),
          formatOperatorDuration(Number((row.metadata as any)?.overtimeSeconds || 0)),
          String((row.metadata as any)?.idleTime || "-"),
          String((row.metadata as any)?.remark || "-"),
          ...(isAdmin ? [getRevenueForLog(row, workedSecondsMap)] : []),
          formatOperatorLogStatus(row.status),
        ];
      });
      const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `operator_logs_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })().catch(() => {
      setToast({ message: "Failed to export operator logs.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    });
  }, [
    calculateWorkedSecondsByLogs,
    designationByUserName,
    filterOperatorLogs,
    getMachineNumberForLog,
    getRevenueForLog,
    isAdmin,
    operatorLogMachine,
    operatorLogStatus,
    setToast,
  ]);

  const operatorLogColumnDefs = useMemo(() => buildOperatorLogColumnDefs(logsColumns), [logsColumns]);

  const logsFetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (hasOperatorLogSearch) {
        const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
          async (pageOffset, pageLimit) => {
            const page = await getEmployeeLogsPage({
              role: "OPERATOR",
              status: operatorLogStatus || undefined,
              machine: operatorLogMachine || undefined,
              offset: pageOffset,
              limit: pageLimit,
            });
            return { items: page.items, hasMore: page.hasMore };
          },
          OPERATOR_LOG_SEARCH_FETCH_PAGE_SIZE
        );
        return { items: allLogs, hasMore: false };
      }

      const page = await getEmployeeLogsPage({
        role: "OPERATOR",
        status: operatorLogStatus || undefined,
        machine: operatorLogMachine || undefined,
        offset,
        limit,
      });
      return { items: page.items, hasMore: page.hasMore };
    },
    [hasOperatorLogSearch, operatorLogMachine, operatorLogStatus]
  );

  return {
    machineFilterOptions,
    filterOperatorLogs,
    hasOperatorLogSearch,
    handleExportOperatorLogsCsv,
    operatorLogColumnDefs,
    logsFetchPage,
  };
};
