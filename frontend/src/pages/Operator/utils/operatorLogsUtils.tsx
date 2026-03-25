import type { Column } from "../../../components/DataTable";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import type { EmployeeLog } from "../../../types/employeeLog";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../../utils/date";
import { formatMachineLabel, getInitials, getLogUserDisplayName } from "../../../utils/jobFormatting";
import {
  formatOperatorDuration,
  formatOperatorLogStatus,
  formatOperatorWorkItem,
  getOperatorLogColumnWidth,
  getOperatorShiftLabel,
  renderOperatorShiftBadge,
} from "./operatorLogHelpers";
import { matchesSearchQuery } from "../../../utils/searchUtils";

export const buildOperatorLogsColumns = ({
  designationByUserName,
  getMachineNumberForLog,
  getRevenueForLog,
  isAdmin,
}: {
  designationByUserName: Map<string, string>;
  getMachineNumberForLog: (log: EmployeeLog) => string;
  getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
  isAdmin: boolean;
}): Column<EmployeeLog>[] => [
  {
    key: "userName",
    label: "User",
    sortable: false,
    render: (row) => {
      const name = getLogUserDisplayName(row.userName, row.userEmail, "Operator");
      const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
      return (
        <div className="log-user-stack log-user-badge-stack">
          <span className="log-user-initial-badge" title={name.toUpperCase()}>{getInitials(name)}</span>
          <strong title={name.toUpperCase()}>{name}</strong>
          <span>{designation}</span>
        </div>
      );
    },
  },
  { key: "machineNumber", label: "MACH #", sortable: false, render: (row) => formatMachineLabel(getMachineNumberForLog(row)) },
  { key: "workItemTitle", label: "Work Item", sortable: false, className: "operator-log-text-col", render: (row) => formatOperatorWorkItem(row.workItemTitle) },
  { key: "jobDescription", label: "Description", sortable: false, className: "operator-log-text-col", render: (row) => <MarqueeCopyText text={String(row.jobDescription || "-")} /> },
  { key: "workSummary", label: "Summary", sortable: false, className: "operator-log-text-col", render: (row) => <MarqueeCopyText text={String(row.workSummary || "-")} /> },
  {
    key: "startedAt",
    label: "Started at",
    sortable: false,
    render: (row) => {
      const parts = getDisplayDateTimeParts(row.startedAt);
      return <div className="created-at-split"><span>{parts.date}</span><span>{parts.time}</span></div>;
    },
  },
  {
    key: "endedAt",
    label: "Ended at",
    sortable: false,
    render: (row) => {
      const parts = getDisplayDateTimeParts(row.endedAt);
      return <div className="created-at-split"><span>{parts.date}</span><span>{parts.time}</span></div>;
    },
  },
  { key: "shift", label: "Shift", sortable: false, render: (row) => renderOperatorShiftBadge(row.startedAt) },
  { key: "durationSeconds", label: "Duration", sortable: false, render: (row) => formatOperatorDuration(row.durationSeconds) },
  { key: "estimatedSeconds", label: "Estimated", sortable: false, render: (row) => formatOperatorDuration(Number((row.metadata as any)?.estimatedSeconds || 0)) },
  { key: "overtimeSeconds", label: "Overtime", sortable: false, render: (row) => formatOperatorDuration(Number((row.metadata as any)?.overtimeSeconds || 0)) },
  { key: "idleTime", label: "Idle Time", sortable: false, render: (row) => String((row.metadata as any)?.idleTime || "-") },
  { key: "remark", label: "Remark", sortable: false, render: (row) => String((row.metadata as any)?.remark || "-") },
  ...(isAdmin ? [{
    key: "revenue",
    label: "Revenue",
    sortable: false,
    render: (row: EmployeeLog) => <span className="log-revenue-value">{getRevenueForLog(row)}</span>,
  } as Column<EmployeeLog>] : []),
  {
    key: "status",
    label: "Status",
    sortable: false,
    render: (row) => {
      const raw = String(row.status || "-").toUpperCase();
      const statusClass = raw === "IN_PROGRESS" ? "in-progress" : raw === "REJECTED" ? "rejected" : "completed";
      return <span className={`log-status-badge ${statusClass}`}>{formatOperatorLogStatus(row.status)}</span>;
    },
  },
];

export const buildOperatorLogColumnDefs = (columns: Column<EmployeeLog>[]) =>
  columns.map((column) => ({
    headerName: typeof column.label === "string" ? column.label : String(column.key),
    field: column.key,
    width: getOperatorLogColumnWidth(String(column.key)),
    minWidth: getOperatorLogColumnWidth(String(column.key)),
    cellClass: column.className,
    headerClass: column.headerClassName,
    cellRenderer: column.render ? ((params: any) => column.render!(params.data, params.node?.rowIndex || 0)) : undefined,
  }));

export const buildOperatorLogFilter =
  ({
    designationByUserName,
    getMachineNumberForLog,
    getRevenueForLog,
    isAdmin,
    operatorLogSearch,
  }: {
    designationByUserName: Map<string, string>;
    getMachineNumberForLog: (log: EmployeeLog) => string;
    getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
    isAdmin: boolean;
    operatorLogSearch: string;
  }) =>
  (logs: EmployeeLog[]) =>
    logs.filter((log) =>
      matchesSearchQuery(
        [
          getLogUserDisplayName(log.userName, log.userEmail, "Operator"),
          designationByUserName.get(getLogUserDisplayName(log.userName, log.userEmail, "Operator").toLowerCase()) || "Operator",
          formatMachineLabel(getMachineNumberForLog(log)),
          formatOperatorWorkItem(log.workItemTitle),
          log.jobDescription || "",
          log.workSummary || "",
          formatDisplayDateTime(log.startedAt),
          formatDisplayDateTime(log.endedAt || null),
          getOperatorShiftLabel(log.startedAt),
          formatOperatorDuration(log.durationSeconds),
          formatOperatorDuration(Number((log.metadata as any)?.estimatedSeconds || 0)),
          formatOperatorDuration(Number((log.metadata as any)?.overtimeSeconds || 0)),
          String((log.metadata as any)?.idleTime || "-"),
          String((log.metadata as any)?.remark || "-"),
          ...(isAdmin ? [getRevenueForLog(log)] : []),
          formatOperatorLogStatus(log.status),
        ],
        operatorLogSearch
      )
    );
