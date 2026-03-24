import type { Column } from "../../../components/DataTable";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import type { EmployeeLog } from "../../../types/employeeLog";
import { getDisplayDateTimeParts } from "../../../utils/date";

export type RoleTab = "PROGRAMMER" | "OPERATOR" | "QC";

export const formatRoleLabel = (role?: string) => {
  const value = String(role || "").toUpperCase();
  if (value === "PROGRAMMER") return "Programmer";
  if (value === "OPERATOR") return "Operator";
  if (value === "QC") return "QC";
  if (value === "ADMIN") return "Admin";
  return value || "-";
};

export const formatDuration = (seconds?: number) => {
  const safe = Math.max(0, Number(seconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const formatLogStatus = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "IN_PROGRESS") return "In Progress";
  if (value === "REJECTED") return "Rejected";
  if (value === "COMPLETED") return "Completed";
  return value || "-";
};

export const formatWorkItemTitle = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return raw.replace(/^Job\s*#\s*/i, "Job # ");
};

export const getInitials = (value: string) => {
  const full = String(value || "").trim();
  if (!full) return "--";
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return full.slice(0, 2).toUpperCase();
};

export const getWorkedSecondsForLog = (log: EmployeeLog) => {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const machineHrs = Number(metadata.machineHrs || 0);
  if (Number.isFinite(machineHrs) && machineHrs > 0) return Math.max(0, Math.round(machineHrs * 3600));
  return Math.max(0, Number(log.durationSeconds || 0));
};

export const getQuantityLabel = (row: EmployeeLog) =>
  Number(row.quantityCount || 0) ||
  Number((row.metadata as any)?.quantityCount || 0) ||
  (Number(row.quantityTo || 0) && Number(row.quantityFrom || 0) ? Number(row.quantityTo) - Number(row.quantityFrom) + 1 : 0);

export const createEmployeeLogColumns = ({
  activeRole,
  isAdmin,
  getRevenueLabel,
}: {
  activeRole: RoleTab;
  isAdmin: boolean;
  getRevenueLabel: (row: EmployeeLog) => string;
}): Column<EmployeeLog>[] => {
  const employeeColumn: Column<EmployeeLog> = {
    key: "employee",
    label: "Employee",
    sortable: false,
    render: (row) => (
      <div className="employee-log-user employee-log-user-badge">
        <span className="employee-log-user-initial-badge" title={String(row.userName || "Unknown User").toUpperCase()}>
          {getInitials(String(row.userName || "Unknown User"))}
        </span>
        <span>{formatRoleLabel((row.metadata as any)?.userRole || row.role)}</span>
      </div>
    ),
  };

  if (activeRole === "OPERATOR") {
    return [
      employeeColumn,
      { key: "workItemTitle", label: "Work Item", sortable: false, render: (row) => formatWorkItemTitle(row.workItemTitle) },
      { key: "jobDescription", label: "Description", sortable: false, render: (row) => <MarqueeCopyText text={String(row.jobDescription || "-")} /> },
      { key: "workSummary", label: "Summary", sortable: false, render: (row) => <MarqueeCopyText text={String(row.workSummary || "-")} /> },
      { key: "idleTime", label: "Idle Time", sortable: false, render: (row) => String((row.metadata as any)?.idleTime || "-") },
      { key: "remark", label: "Remark", sortable: false, render: (row) => String((row.metadata as any)?.remark || "-") },
      ...(isAdmin ? [{ key: "revenue", label: "Revenue", sortable: false, render: (row) => getRevenueLabel(row) } as Column<EmployeeLog>] : []),
      createDateColumn("startedAt", "Started At"),
      createDateColumn("endedAt", "Ended At", true),
      { key: "durationSeconds", label: "Time Taken", sortable: false, render: (row) => formatDuration(row.durationSeconds) },
      createStatusColumn(),
    ];
  }

  return [
    employeeColumn,
    { key: "workItemTitle", label: "Work Item", sortable: false, className: "employee-work-item-cell", render: (row) => <div className="employee-work-item"><span className="ref-badge">Job #{row.refNumber || ""}</span></div> },
    { key: "jobDescription", label: "Description", sortable: false, render: (row) => <MarqueeCopyText text={String(row.jobDescription || "-")} /> },
    { key: "quantityCount", label: "Quantities", sortable: false, render: (row) => getQuantityLabel(row) || "-" },
    createDateColumn("startedAt", "Started At"),
    createDateColumn("endedAt", "Ended At", true),
    { key: "durationSeconds", label: "Time Taken", sortable: false, render: (row) => formatDuration(row.durationSeconds) },
    createStatusColumn(),
  ];
};

const createDateColumn = (key: "startedAt" | "endedAt", label: string, allowNull = false): Column<EmployeeLog> => ({
  key,
  label,
  sortable: false,
  render: (row) => {
    const parts = getDisplayDateTimeParts(allowNull ? row[key] || null : row[key]);
    return <div className="created-at-split"><span>{parts.date}</span><span>{parts.time}</span></div>;
  },
});

const createStatusColumn = (): Column<EmployeeLog> => ({
  key: "status",
  label: "Status",
  sortable: false,
  className: "employee-status-cell",
  headerClassName: "employee-status-col",
  render: (row) => <span className={`employee-log-status status-${row.status.toLowerCase()}`}>{row.status === "IN_PROGRESS" ? "In Progress" : row.status === "REJECTED" ? "Rejected" : "Completed"}</span>,
});
