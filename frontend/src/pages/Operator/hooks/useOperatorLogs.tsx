import { useCallback, useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { JobEntry } from "../../../types/job";
import { formatDisplayDateTime } from "../../../utils/date";
import {
  getDisplayName,
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
  operatorLogSearch: string;
  operatorLogUser: string;
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
  operatorLogSearch,
  operatorLogUser,
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
      const designation = role === "ADMIN" ? "Admin" : role === "OPERATOR" ? "OPS" : role;
      if (fullName) map.set(fullName.toLowerCase(), designation);
      if (firstName) map.set(firstName.toLowerCase(), designation);
      if (emailLocalPart) map.set(emailLocalPart.toLowerCase(), designation);
    });
    return map;
  }, [users]);

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
    (log: EmployeeLog) => {
      const rawStatus = String(log.status || "").trim().toUpperCase();
      if (rawStatus === "IN_PROGRESS") {
        return "-";
      }

      const metadata = (log.metadata || {}) as Record<string, any>;
      const explicitRevenue = log.revenue ?? metadata.revenue;
      if (explicitRevenue !== undefined && explicitRevenue !== null && String(explicitRevenue).trim() !== "") {
        const numericValue = Number(explicitRevenue);
        if (Number.isFinite(numericValue)) return `Rs. ${numericValue.toFixed(2)}`;
        return String(explicitRevenue);
      }

      return "-";
    },
    []
  );

  const getWorkedDurationForLog = useCallback((log: EmployeeLog) => {
    const workedSeconds = Number((log.metadata as any)?.workedSeconds || 0);
    if (Number.isFinite(workedSeconds) && workedSeconds > 0) {
      return Math.max(0, Math.round(workedSeconds));
    }
    return Math.max(0, Number(log.durationSeconds || 0));
  }, []);

  const machineFilterOptions = machineOptionsForDropdown;

  const userFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    return users
      .map((user) => getDisplayName(user.firstName, user.lastName, user.email, "USER"))
      .filter((name) => {
        const key = String(name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => left.localeCompare(right));
  }, [users]);

  const logsColumns = useMemo<Column<EmployeeLog>[]>(() => buildOperatorLogsColumns({
    designationByUserName,
    getMachineNumberForLog,
    getRevenueForLog,
  }), [designationByUserName, getMachineNumberForLog, getRevenueForLog]);

  const filterOperatorLogs = useMemo(
    () =>
      buildOperatorLogFilter({
        designationByUserName,
        getMachineNumberForLog,
        getRevenueForLog,
        getWorkedDurationForLog,
        operatorLogUser,
        operatorLogSearch,
      }),
    [designationByUserName, getMachineNumberForLog, getRevenueForLog, getWorkedDurationForLog, operatorLogSearch, operatorLogUser]
  );

  const hasOperatorLogSearch = operatorLogSearch.trim().length > 0;
  const hasOperatorLogUserFilter = operatorLogUser.trim().length > 0;

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
      const headers = ["User", "MACH #", "Job Ref", "Description", "Summary", "Started at", "Ended at", "Shift", "Duration", "Estimated", "Overtime", "Qty Split", "Idle Time", "Remark", "Revenue", "Revenue Split", "Status"];
      const rows = filteredLogs.map((row) => {
        const name = getLogUserDisplayName(row.userName, row.userEmail, "");
        const designation = designationByUserName.get(name.toLowerCase()) || "OPS";
        const revenueByQuantity = Object.entries(((row.metadata as any)?.revenueByQuantity || {}) as Record<string, number>)
          .map(([qty, amount]) => `Q${qty}: Rs. ${Number(amount || 0).toFixed(2)}`)
          .join(" | ");
        return [
          name ? `${name} (${designation})` : designation,
          formatMachineLabel(getMachineNumberForLog(row)),
          formatOperatorWorkItem(row.workItemTitle),
          row.jobDescription || "",
          row.workSummary || "",
          formatDisplayDateTime(row.startedAt),
          formatDisplayDateTime(row.endedAt || null),
          getOperatorShiftLabel(row.startedAt),
          formatOperatorDuration(getWorkedDurationForLog(row)),
          formatOperatorDuration(Number((row.metadata as any)?.estimatedSeconds || 0)),
          formatOperatorDuration(Number((row.metadata as any)?.overtimeSeconds || 0)),
          Array.isArray((row.metadata as any)?.quantityNumbers)
            ? (row.metadata as any).quantityNumbers.map((qty: number) => `Q${qty}`).join(", ")
            : "-",
          String((row.metadata as any)?.idleTime || "-"),
          String((row.metadata as any)?.remark || "-"),
          getRevenueForLog(row),
          revenueByQuantity || "-",
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
    designationByUserName,
    filterOperatorLogs,
    getMachineNumberForLog,
    getRevenueForLog,
    operatorLogMachine,
    operatorLogStatus,
    setToast,
  ]);

  const operatorLogColumnDefs = useMemo(() => buildOperatorLogColumnDefs(logsColumns), [logsColumns]);

  const logsFetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (hasOperatorLogSearch || hasOperatorLogUserFilter) {
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
    [hasOperatorLogSearch, hasOperatorLogUserFilter, operatorLogMachine, operatorLogStatus]
  );

  return {
    machineFilterOptions,
    userFilterOptions,
    filterOperatorLogs,
    hasOperatorLogSearch,
    handleExportOperatorLogsCsv,
    operatorLogColumnDefs,
    logsFetchPage,
  };
};
