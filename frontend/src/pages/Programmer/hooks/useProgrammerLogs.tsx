import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import JobRefLink from "../../../components/JobRefLink";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { User } from "../../../types/user";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../../utils/date";
import { fetchAllPaginatedItems } from "../../../utils/paginationUtils";
import { formatJobRefDisplay, getDisplayName, getInitials, getLogUserDisplayName } from "../../../utils/jobFormatting";
import { matchesSearchQuery } from "../../../utils/searchUtils";
import { getEmployeeLogsPage } from "../../../services/employeeLogsApi";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";

export const SEARCH_FETCH_PAGE_SIZE = 100;

const PROGRAMMER_LOG_COLUMN_WIDTHS: Record<string, number> = {
  user: 96,
  jobNumber: 96,
  description: 168,
  summary: 176,
  startedAt: 108,
  endedAt: 108,
  shift: 72,
  duration: 84,
  status: 110,
};

const getProgrammerLogColumnWidth = (columnKey: string) =>
  PROGRAMMER_LOG_COLUMN_WIDTHS[columnKey] ?? 88;

const formatProgrammerJobRef = (value?: string) => {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (!raw) return "-";
  return formatJobRefDisplay(raw) || "-";
};

const formatDuration = (seconds?: number): string => {
  const total = Math.max(0, Number(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const getShiftLabel = (startedAt?: string): string => {
  if (!startedAt) return "-";
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "-";
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "Day" : "Night";
};

export const formatProgrammerLogStatus = (status?: string) => {
  const raw = String(status || "-").toUpperCase();
  if (raw === "IN_PROGRESS") return "RUNNING";
  if (raw === "REJECTED") return "HOLD";
  if (raw === "COMPLETED") return "LOGGED";
  return raw
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

type UseProgrammerLogsArgs = {
  users: User[];
  logSearch: string;
  logStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  logUserId: string;
  setToast: React.Dispatch<
    React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
  >;
};

export const useProgrammerLogs = ({
  users,
  logSearch,
  logStatus,
  logUserId,
  setToast,
}: UseProgrammerLogsArgs) => {
  const designationByUserId = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const role = String(u.role || "").toUpperCase();
      if (role === "ADMIN") map.set(String(u._id), "Admin");
      else if (role === "PROGRAMMER") map.set(String(u._id), "Programmer");
    });
    return map;
  }, [users]);

  const programmerLogColumns = useMemo<Column<EmployeeLog>[]>(
    () => [
      {
        key: "user",
        label: "User",
        sortable: false,
        className: "programmer-log-user-col",
        headerClassName: "programmer-log-user-col",
        render: (row) => {
          const designation = designationByUserId.get(String(row.userId)) || "Programmer";
          const name = getLogUserDisplayName(row.userName, row.userEmail, "Programmer");
          return (
            <div className="log-user-stack log-user-badge-stack">
              <span className="log-user-initial-badge" title={name.toUpperCase()}>
                {getInitials(name)}
              </span>
              <span>{designation}</span>
            </div>
          );
        },
      },
      {
        key: "jobNumber",
        label: "JOB #",
        sortable: false,
        render: (row) => (
          <JobRefLink
            role="PROGRAMMER"
            jobGroupId={row.jobGroupId}
            jobId={row.jobId}
            refNumber={row.refNumber}
            fallbackLabel={formatProgrammerJobRef(String(row.refNumber || row.workItemTitle || ""))}
          />
        ),
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        className: "programmer-log-summary-col",
        headerClassName: "programmer-log-summary-col",
        render: (row) => <MarqueeCopyText text={String(row.jobDescription || "-")} />,
      },
      {
        key: "summary",
        label: "Summary",
        sortable: false,
        className: "programmer-log-summary-col",
        headerClassName: "programmer-log-summary-col",
        render: (row) => <MarqueeCopyText text={String((row as any).workSummary || "-")} />,
      },
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
          const parts = getDisplayDateTimeParts(row.endedAt || null);
          return <div className="created-at-split"><span>{parts.date}</span><span>{parts.time}</span></div>;
        },
      },
      {
        key: "shift",
        label: "Shift",
        sortable: false,
        render: (row) => {
          const shift = getShiftLabel(row.startedAt);
          if (shift === "Day") {
            return <span className="shift-icon-badge day" title="Day Shift"><WbSunnyOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
          }
          if (shift === "Night") {
            return <span className="shift-icon-badge night" title="Night Shift"><DarkModeOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
          }
          return "-";
        },
      },
      { key: "duration", label: "Duration", sortable: false, render: (row) => formatDuration(row.durationSeconds) },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (row) => {
          const raw = String(row.status || "-").toUpperCase();
          const label = formatProgrammerLogStatus(row.status);
          const statusClass = raw === "IN_PROGRESS" ? "in-progress" : raw === "REJECTED" ? "stopped" : "completed";
          return <span className={`log-status-badge ${statusClass}`}>{label}</span>;
        },
      },
    ],
    [designationByUserId]
  );

  const filterProgrammerLogs = useMemo(
    () => (logs: EmployeeLog[]) =>
      logs.filter((log) => {
        if (logUserId && String(log.userId) !== String(logUserId)) return false;

        const designation = designationByUserId.get(String(log.userId)) || "Programmer";
        const name = getLogUserDisplayName(log.userName, log.userEmail, "Programmer");

        return matchesSearchQuery(
          [
            name,
            designation,
            `${name} ${designation}`.trim(),
            formatProgrammerJobRef(String(log.refNumber || log.workItemTitle || "")),
            String(log.jobDescription || "-"),
            String((log as any).workSummary || "-"),
            formatDisplayDateTime(log.startedAt),
            formatDisplayDateTime(log.endedAt || null),
            getShiftLabel(log.startedAt),
            formatDuration(log.durationSeconds),
            formatProgrammerLogStatus(log.status),
          ],
          logSearch
        );
      }),
    [designationByUserId, logSearch, logUserId]
  );

  const handleExportProgrammerLogsCsv = () => {
    void (async () => {
      const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
        async (offset, limit) => {
          const page = await getEmployeeLogsPage({
            role: "PROGRAMMER",
            status: logStatus || undefined,
            offset,
            limit,
          });
          return { items: page.items, hasMore: page.hasMore };
        },
        SEARCH_FETCH_PAGE_SIZE
      );

      const filteredProgrammerLogs = filterProgrammerLogs(allLogs);
      const headers = ["User", "JOB #", "Description", "Summary", "Started at", "Ended at", "Shift", "Duration", "Status"];
      const rows = filteredProgrammerLogs.map((row) => {
        const designation = designationByUserId.get(String(row.userId)) || "Programmer";
        const name = getLogUserDisplayName(row.userName, row.userEmail, "");
        const userValue = name ? `${name} (${designation})` : designation;
        return [
          userValue,
          formatProgrammerJobRef(String(row.refNumber || row.workItemTitle || "")),
          String(row.jobDescription || "-"),
          String((row as any).workSummary || "-"),
          formatDisplayDateTime(row.startedAt),
          formatDisplayDateTime(row.endedAt || null),
          getShiftLabel(row.startedAt),
          formatDuration(row.durationSeconds),
          formatProgrammerLogStatus(row.status),
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `programmer_logs_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })().catch(() => {
      setToast({ message: "Failed to export programmer logs.", variant: "error", visible: true });
    });
  };

  const programmerLogColumnDefs = useMemo(
    () =>
      programmerLogColumns.map((column) => ({
        headerName: typeof column.label === "string" ? column.label : String(column.key),
        field: column.key,
        width: getProgrammerLogColumnWidth(String(column.key)),
        minWidth: getProgrammerLogColumnWidth(String(column.key)),
        cellClass: column.className,
        headerClass: column.headerClassName,
        cellRenderer: column.render ? ((params: any) => column.render!(params.data, params.node?.rowIndex || 0)) : undefined,
      })),
    [programmerLogColumns]
  );

  return {
    filterProgrammerLogs,
    handleExportProgrammerLogsCsv,
    programmerLogColumnDefs,
    hasLogSearch: logSearch.trim().length > 0,
    programmerUsers: users
      .filter((user) => user.role === "PROGRAMMER" || user.role === "ADMIN")
      .map((user) => ({
        id: user._id,
        label: getDisplayName(user.firstName, user.lastName, user.email).toUpperCase(),
      })),
  };
};
