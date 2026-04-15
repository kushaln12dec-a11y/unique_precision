import type { Column } from "../../../components/DataTable";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import JobRefLink from "../../../components/JobRefLink";
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

const getDisplayedWorkedSeconds = (row: EmployeeLog) => {
  const workedSeconds = Number((row.metadata as any)?.workedSeconds || 0);
  if (Number.isFinite(workedSeconds) && workedSeconds > 0) {
    return Math.max(0, Math.round(workedSeconds));
  }
  return Math.max(0, Number(row.durationSeconds || 0));
};

export const buildOperatorLogsColumns = ({
  designationByUserName,
  getMachineNumberForLog,
  getRevenueForLog,
}: {
  designationByUserName: Map<string, string>;
  getMachineNumberForLog: (log: EmployeeLog) => string;
  getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
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
          <span>{designation}</span>
        </div>
      );
    },
  },
  { key: "machineNumber", label: "MACH #", sortable: false, render: (row) => formatMachineLabel(getMachineNumberForLog(row)) },
  {
    key: "workItemTitle",
    label: "Job Ref",
    sortable: false,
    className: "operator-log-text-col",
    render: (row) => (
      <JobRefLink
        role="OPERATOR"
        jobGroupId={row.jobGroupId}
        jobId={row.jobId}
        refNumber={row.refNumber}
        fallbackLabel={formatOperatorWorkItem(row.refNumber || row.workItemTitle)}
      />
    ),
  },
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
  { key: "durationSeconds", label: "Duration", sortable: false, render: (row) => formatOperatorDuration(getDisplayedWorkedSeconds(row)) },
  { key: "estimatedSeconds", label: "Estimated", sortable: false, render: (row) => formatOperatorDuration(Number((row.metadata as any)?.estimatedSeconds || 0)) },
  { key: "overtimeSeconds", label: "Overtime", sortable: false, render: (row) => formatOperatorDuration(Number((row.metadata as any)?.overtimeSeconds || 0)) },
  {
    key: "quantityNumbers",
    label: "Qty Split",
    sortable: false,
    render: (row) => {
      const quantities = Array.isArray((row.metadata as any)?.quantityNumbers)
        ? (row.metadata as any).quantityNumbers
        : [];
      return quantities.length ? quantities.map((qty: number) => `Q${qty}`).join(", ") : "-";
    },
  },
  { key: "idleTime", label: "Idle Time", sortable: false, render: (row) => String((row.metadata as any)?.idleTime || "-") },
  { key: "remark", label: "Remark", sortable: false, render: (row) => String((row.metadata as any)?.remark || "-") },
  {
    key: "revenue",
    label: "Revenue",
    sortable: false,
    render: (row: EmployeeLog) => {
      const displayRevenue = getRevenueForLog(row);
      if (displayRevenue === "-") {
        return <span className="log-revenue-value">-</span>;
      }

      const revenueByQuantity = ((row.metadata as any)?.revenueByQuantity || {}) as Record<string, number>;
      const splitEntries = Object.entries(revenueByQuantity)
        .map(([qty, amount]) => [Number(qty), Number(amount)] as const)
        .filter(([qty, amount]) => Number.isInteger(qty) && Number.isFinite(amount))
        .sort((left, right) => left[0] - right[0]);

      if (splitEntries.length === 0) {
        return <span className="log-revenue-value">{displayRevenue}</span>;
      }

      return (
        <div className="log-revenue-breakdown" title={splitEntries.map(([qty, amount]) => `Q${qty}: Rs. ${amount.toFixed(2)}`).join(" | ")}>
          <span className="log-revenue-value">{displayRevenue}</span>
          <span className="log-revenue-split">
            {splitEntries.map(([qty, amount]) => `Q${qty}: Rs. ${amount.toFixed(2)}`).join(" | ")}
          </span>
        </div>
      );
    },
  } as Column<EmployeeLog>,
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
  columns.map((column) => {
    const key = String(column.key);
    const preferredWidth = getOperatorLogColumnWidth(key);
    const minWidth =
      key === "jobDescription" || key === "workSummary"
        ? 110
        : key === "status"
          ? 96
          : key === "userName"
            ? 86
            : 68;

    return {
      headerName: typeof column.label === "string" ? column.label : key,
      field: column.key,
      width: preferredWidth,
      minWidth,
      cellClass: column.className,
      headerClass: column.headerClassName,
      cellRenderer: column.render ? ((params: any) => column.render!(params.data, params.node?.rowIndex || 0)) : undefined,
    };
  });

export const buildOperatorLogFilter =
  ({
    designationByUserName,
    getMachineNumberForLog,
    getRevenueForLog,
    getWorkedDurationForLog,
    operatorLogUser,
    operatorLogSearch,
  }: {
    designationByUserName: Map<string, string>;
    getMachineNumberForLog: (log: EmployeeLog) => string;
    getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
    getWorkedDurationForLog: (log: EmployeeLog) => number;
    operatorLogUser: string;
    operatorLogSearch: string;
    }) =>
  (logs: EmployeeLog[]) =>
    logs.filter((log) => {
      const normalizedUserName = getLogUserDisplayName(log.userName, log.userEmail, "Operator");
      const matchesUser =
        !operatorLogUser ||
        normalizedUserName.toLowerCase() === String(operatorLogUser || "").trim().toLowerCase();

      if (!matchesUser) return false;

      return matchesSearchQuery(
        [
          normalizedUserName,
          designationByUserName.get(getLogUserDisplayName(log.userName, log.userEmail, "Operator").toLowerCase()) || "Operator",
          formatMachineLabel(getMachineNumberForLog(log)),
          formatOperatorWorkItem(log.refNumber || log.workItemTitle),
          log.jobDescription || "",
          log.workSummary || "",
          formatDisplayDateTime(log.startedAt),
          formatDisplayDateTime(log.endedAt || null),
          getOperatorShiftLabel(log.startedAt),
          formatOperatorDuration(getWorkedDurationForLog(log)),
          formatOperatorDuration(Number((log.metadata as any)?.estimatedSeconds || 0)),
          formatOperatorDuration(Number((log.metadata as any)?.overtimeSeconds || 0)),
          Array.isArray((log.metadata as any)?.quantityNumbers)
            ? (log.metadata as any).quantityNumbers.map((qty: number) => `Q${qty}`).join(", ")
            : "-",
          String((log.metadata as any)?.idleTime || "-"),
          String((log.metadata as any)?.remark || "-"),
          getRevenueForLog(log),
          formatOperatorLogStatus(log.status),
        ],
        operatorLogSearch
      );
    });
