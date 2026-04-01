import { useMemo, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import LazyAgGrid from "../../../components/LazyAgGrid";
import { getEmployeeLogsPage } from "../../../services/employeeLogsApi";
import type { EmployeeLog } from "../../../types/employeeLog";
import { getUserRoleFromToken } from "../../../utils/auth";
import { getDisplayDateTimeParts } from "../../../utils/date";
import { fetchAllPaginatedItems } from "../../../utils/paginationUtils";
import { matchesSearchQuery } from "../../../utils/searchUtils";
import {
  type RoleTab,
  createEmployeeLogColumns,
  formatDuration,
  formatLogStatus,
  formatRoleLabel,
  normalizeJobReference,
  getQuantityLabel,
  getWorkedSecondsForLog,
} from "./employeeLogsPanelUtils";

export const EmployeeLogsPanel = () => {
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const [activeRole, setActiveRole] = useState<RoleTab>("PROGRAMMER");
  const [statusFilter, setStatusFilter] = useState<"" | "COMPLETED" | "IN_PROGRESS" | "REJECTED">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const getRevenueLabel = (row: EmployeeLog) => {
    const metadata = (row.metadata || {}) as Record<string, any>;
    const explicit = row.revenue ?? metadata.revenue;
    if (explicit !== undefined && explicit !== null && String(explicit).trim() !== "") {
      const numeric = Number(explicit);
      return Number.isFinite(numeric) ? `Rs. ${numeric.toFixed(2)}` : String(explicit);
    }

    const wedm = Number(metadata.wedmAmount || 0);
    if (!wedm) return "-";

    const groupWorkedSecondsByGroupId = new Map<string, number>();
    const groupId = String(row.jobGroupId || "").trim();
    const totalWorkedSeconds = groupId ? groupWorkedSecondsByGroupId.get(groupId) || 0 : 0;
    if (!totalWorkedSeconds) return `Rs. ${wedm.toFixed(2)}`;

    const share = Math.max(0, getWorkedSecondsForLog(row)) / totalWorkedSeconds;
    return `Rs. ${(wedm * share).toFixed(2)}`;
  };

  const columns = useMemo(() => createEmployeeLogColumns({ activeRole, isAdmin, getRevenueLabel }), [activeRole, isAdmin]);

  const getColumnMinWidth = (columnKey: string) => {
    if (columnKey === "employee") return 96;
    if (columnKey === "workItemTitle") return 126;
    if (columnKey === "jobDescription" || columnKey === "workSummary") return 128;
    if (columnKey === "quantityCount") return 84;
    if (columnKey === "startedAt" || columnKey === "endedAt") return 104;
    if (columnKey === "durationSeconds") return 92;
    if (columnKey === "status") return 118;
    if (columnKey === "idleTime" || columnKey === "remark") return 88;
    if (columnKey === "revenue") return 90;
    return 80;
  };

  const filterVisibleLogs = useMemo(
    () => (logs: EmployeeLog[]) =>
      logs.filter((log) => {
        const startedAtParts = getDisplayDateTimeParts(log.startedAt);
        const endedAtParts = getDisplayDateTimeParts(log.endedAt || null);
        const commonValues = [
          String(log.userName || "Unknown User"),
          formatRoleLabel((log.metadata as any)?.userRole || log.role),
          startedAtParts.date,
          startedAtParts.time,
          `${startedAtParts.date} ${startedAtParts.time}`.trim(),
          endedAtParts.date,
          endedAtParts.time,
          `${endedAtParts.date} ${endedAtParts.time}`.trim(),
          formatDuration(log.durationSeconds),
          formatLogStatus(log.status),
        ];

        const roleSpecificValues =
          activeRole === "OPERATOR"
            ? [normalizeJobReference(log.refNumber || log.workItemTitle), String(log.jobDescription || "-"), String(log.workSummary || "-"), String((log.metadata as any)?.idleTime || "-"), String((log.metadata as any)?.remark || "-"), ...(isAdmin ? [getRevenueLabel(log)] : [])]
            : [normalizeJobReference(log.refNumber), String(log.jobDescription || "-"), getQuantityLabel(log) || "-"];

        return matchesSearchQuery([...commonValues, ...roleSpecificValues], searchQuery);
      }),
    [activeRole, isAdmin, searchQuery]
  );

  const columnDefs = useMemo(
    () =>
      columns.map((column) => ({
        headerName: typeof column.label === "string" ? column.label : String(column.key),
        field: column.key,
        minWidth: getColumnMinWidth(String(column.key)),
        cellClass: column.className,
        headerClass: column.headerClassName,
        cellRenderer: column.render ? ((params: any) => column.render!(params.data, params.node?.rowIndex || 0)) : undefined,
      })),
    [columns]
  );

  const exportLogs = async () => {
    const logs = await fetchAllPaginatedItems<EmployeeLog>(async (offset, limit) => {
      const page = await getEmployeeLogsPage({ role: activeRole, status: statusFilter || undefined, offset, limit });
      return { items: page.items, hasMore: page.hasMore };
    });

    const filteredLogs = filterVisibleLogs(logs);
    const headers =
      activeRole === "OPERATOR"
        ? ["Employee", "Job Ref", "Description", "Summary", "Idle Time", "Remark", ...(isAdmin ? ["Revenue"] : []), "Started At", "Ended At", "Time Taken", "Status"]
        : ["Employee", "Job Ref", "Description", "Quantities", "Started At", "Ended At", "Time Taken", "Status"];
    const rows = filteredLogs.map((row) =>
      activeRole === "OPERATOR"
        ? [
            `${String(row.userName || "Unknown User")} (${formatRoleLabel((row.metadata as any)?.userRole || row.role)})`,
            normalizeJobReference(row.refNumber || row.workItemTitle),
            String(row.jobDescription || "-"),
            String(row.workSummary || "-"),
            String((row.metadata as any)?.idleTime || "-"),
            String((row.metadata as any)?.remark || "-"),
            ...(isAdmin ? [getRevenueLabel(row)] : []),
            `${getDisplayDateTimeParts(row.startedAt).date} ${getDisplayDateTimeParts(row.startedAt).time}`.trim(),
            `${getDisplayDateTimeParts(row.endedAt || null).date} ${getDisplayDateTimeParts(row.endedAt || null).time}`.trim(),
            formatDuration(row.durationSeconds),
            formatLogStatus(row.status),
          ]
        : [
            `${String(row.userName || "Unknown User")} (${formatRoleLabel((row.metadata as any)?.userRole || row.role)})`,
            normalizeJobReference(row.refNumber),
            String(row.jobDescription || "-"),
            String(getQuantityLabel(row) || "-"),
            `${getDisplayDateTimeParts(row.startedAt).date} ${getDisplayDateTimeParts(row.startedAt).time}`.trim(),
            `${getDisplayDateTimeParts(row.endedAt || null).date} ${getDisplayDateTimeParts(row.endedAt || null).time}`.trim(),
            formatDuration(row.durationSeconds),
            formatLogStatus(row.status),
          ]
    );

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `job_logs_${activeRole.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="employee-logs-container">
      <div className="employee-role-tabs">
        {(["PROGRAMMER", "OPERATOR", "QC"] as RoleTab[]).map((role) => (
          <button key={role} type="button" className={`employee-role-tab ${activeRole === role ? "active" : ""}`} onClick={() => setActiveRole(role)}>
            {role === "PROGRAMMER" ? "Programmer" : role === "OPERATOR" ? "Operator" : "QC"}
          </button>
        ))}
      </div>

      <div className="employee-log-filters">
        <input type="text" className="employee-search-input" placeholder="Search any column..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select className="employee-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | "COMPLETED" | "IN_PROGRESS" | "REJECTED")}>
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button
          type="button"
          className="employee-csv-btn"
          onClick={() => void exportLogs().catch((fetchError: any) => setError(fetchError?.message || "Failed to export employee logs"))}
          title="Download CSV"
        >
          <DownloadIcon sx={{ fontSize: "1rem" }} />
          CSV
        </button>
      </div>

      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <LazyAgGrid
          columnDefs={columnDefs as any}
          transformRows={filterVisibleLogs}
          fetchPage={async (offset, limit) => {
            setError("");
            if (searchQuery.trim()) {
              const allLogs = await fetchAllPaginatedItems<EmployeeLog>(async (pageOffset, pageLimit) => {
                const page = await getEmployeeLogsPage({ role: activeRole, status: statusFilter || undefined, offset: pageOffset, limit: pageLimit });
                return { items: page.items, hasMore: page.hasMore };
              });
              return { items: allLogs, hasMore: false };
            }

            const page = await getEmployeeLogsPage({ role: activeRole, status: statusFilter || undefined, offset, limit });
            return { items: page.items, hasMore: page.hasMore };
          }}
          emptyMessage="No logs found for the current filters."
          getRowId={(row) => row._id}
          className="employee-logs-table logs-center"
          rowHeight={66}
          refreshKey={`${activeRole}|${statusFilter}`}
        />
      )}
    </div>
  );
};
