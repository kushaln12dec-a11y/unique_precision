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


export const formatOperatorIdleWindow = (row: EmployeeLog) => {
  const metadata = ((row.metadata as any) || {}) as Record<string, any>;
  const pauseSessions = Array.isArray(metadata.pauseSessions) ? metadata.pauseSessions : [];

  if (pauseSessions.length > 0) {
    return pauseSessions
      .map((session: any) => {
        const duration = formatOperatorDuration(Number(session?.pauseDuration || 0));
        const reason = session?.pauseReason || "Unknown";
        const sessionTime = session?.startedAt ? new Date(session.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "";
        return `${reason} (${duration})${sessionTime ? ` at ${sessionTime}` : ""}`;
      })
      .join(" | ");
  }

  if (metadata.idleStartedAt) {
    const duration = metadata.idleEndedAt
      ? formatOperatorDuration(Number(metadata.idleDurationSeconds || 0))
      : "Open";
    const reason = metadata.idleTime || "Unknown";
    const startTime = metadata.idleStartedAt ? new Date(metadata.idleStartedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "";
    return `${reason} (${duration})${startTime ? ` from ${startTime}` : ""}`;
  }

  return "-";
};

export const buildOperatorLogsColumns = ({
  designationByUserName,
  getMachineNumberForLog,
  getRevenueForLog,
  canViewRevenue,
}: {
  designationByUserName: Map<string, string>;
  getMachineNumberForLog: (log: EmployeeLog) => string;
  getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
  canViewRevenue: boolean;
}): Column<EmployeeLog>[] => [
  {
    key: "userName",
    label: "User",
    sortable: false,
    render: (row) => {
      const name = getLogUserDisplayName(row.userName, row.userEmail, "Operator");
      const designation = designationByUserName.get(name.toLowerCase()) || "OPS";
      return (
        <div className="log-user-stack log-user-badge-stack log-user-inline-stack">
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
  { key: "durationSeconds", label: "Duration", sortable: false, render: (row) => {
    // Use the actual durationSeconds from the log, fallback to metadata workedSeconds
    const duration = Number(row.durationSeconds || (row.metadata as any)?.workedSeconds || 0);
    return formatOperatorDuration(duration);
  }},
  { key: "estimatedSeconds", label: "Est. Time", sortable: false, render: (row) => {
    const value = (row.metadata as any)?.estimatedSecondsPerQuantity;
    return formatOperatorDuration(value);
  }},
  { key: "overtimeSeconds", label: "OT", sortable: false, render: (row) => {
    const metadata = (row.metadata as any) || {};
    const duration = Number(row.durationSeconds || metadata.workedSeconds || 0);
    const estimatedSeconds = Number(metadata.estimatedSecondsPerQuantity || 0);
    // Calculate overtime on the fly: actual duration - estimated time
    const overtime = Math.max(0, duration - estimatedSeconds);
    return formatOperatorDuration(overtime);
  }},
  {
    key: "quantityNumbers",
    label: "Qty",
    sortable: false,
    render: (row) => {
      const quantities = Array.isArray((row.metadata as any)?.quantityNumbers)
        ? (row.metadata as any).quantityNumbers
        : [];
      return quantities.length ? quantities.map((qty: number) => `Q${qty}`).join(", ") : "-";
    },
  },
  { key: "idleWindow", label: "Idle Window", sortable: false, className: "operator-log-text-col", render: (row) => <MarqueeCopyText text={formatOperatorIdleWindow(row)} /> },
  { key: "remark", label: "Remark", sortable: false, render: (row) => String((row.metadata as any)?.remark || "-") },
  ...(canViewRevenue
    ? [{
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
      } as Column<EmployeeLog>]
    : []),
  {
    key: "status",
    label: "Status",
    sortable: false,
    render: (row) => {
      const raw = String(row.status || "-").toUpperCase();
      const statusClass = raw === "IN_PROGRESS" ? "in-progress" : raw === "REJECTED" ? "rejected" : "completed";
      const historicalStatus = String((row.metadata as any)?.historicalStatus || "").trim().toUpperCase();
      const historicalLabel = historicalStatus ? formatOperatorLogStatus(historicalStatus) : "";
      return (
        <span
          className={`log-status-badge ${statusClass}`}
          title={historicalLabel ? `Previously ${historicalLabel}` : undefined}
        >
          {formatOperatorLogStatus(row.status)}
        </span>
      );
    },
  },
];

export const buildOperatorLogColumnDefs = (columns: Column<EmployeeLog>[]) =>
  columns.map((column) => {
    const key = String(column.key);
    const preferredWidth = getOperatorLogColumnWidth(key);
    const minWidth =
      key === "jobDescription" || key === "workSummary" || key === "idleWindow"
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
    canViewRevenue,
    operatorLogUser,
    operatorLogStatus,
    operatorLogSearch,
  }: {
    designationByUserName: Map<string, string>;
    getMachineNumberForLog: (log: EmployeeLog) => string;
    getRevenueForLog: (log: EmployeeLog, workedSecondsMap?: Map<string, number>) => string;
    canViewRevenue: boolean;
    operatorLogUser: string;
    operatorLogStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
    operatorLogSearch: string;
  }) =>
  (logs: EmployeeLog[]) =>
    logs.filter((log) => {
      const matchesStatus =
        !operatorLogStatus ||
        String(log.status || "").trim().toUpperCase() === String(operatorLogStatus || "").trim().toUpperCase();

      if (!matchesStatus) return false;

      const normalizedUserName = getLogUserDisplayName(log.userName, log.userEmail, "Operator");
      const matchesUser =
        !operatorLogUser ||
        normalizedUserName.toLowerCase() === String(operatorLogUser || "").trim().toLowerCase();

      if (!matchesUser) return false;

      return matchesSearchQuery(
        [
          normalizedUserName,
          designationByUserName.get(getLogUserDisplayName(log.userName, log.userEmail, "Operator").toLowerCase()) || "OPS",
          formatMachineLabel(getMachineNumberForLog(log)),
          formatOperatorWorkItem(log.refNumber || log.workItemTitle),
          log.jobDescription || "",
          log.workSummary || "",
          formatDisplayDateTime(log.startedAt),
          formatDisplayDateTime(log.endedAt || null),
          getOperatorShiftLabel(log.startedAt),
          formatOperatorDuration(Number(log.durationSeconds || (log.metadata as any)?.workedSeconds || 0)),
          formatOperatorDuration((log.metadata as any)?.estimatedSecondsPerQuantity),
          (() => {
            const duration = Number(log.durationSeconds || (log.metadata as any)?.workedSeconds || 0);
            const estimatedSeconds = Number((log.metadata as any)?.estimatedSecondsPerQuantity || 0);
            const overtime = Math.max(0, duration - estimatedSeconds);
            return formatOperatorDuration(overtime);
          })(),
          Array.isArray((log.metadata as any)?.quantityNumbers)
            ? (log.metadata as any).quantityNumbers.map((qty: number) => `Q${qty}`).join(", ")
            : "-",
          formatOperatorIdleWindow(log),
          String((log.metadata as any)?.remark || "-"),
          ...(canViewRevenue ? [getRevenueForLog(log)] : []),
          formatOperatorLogStatus(log.status),
        ],
        operatorLogSearch
      );
    });
