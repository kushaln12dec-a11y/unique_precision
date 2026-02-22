import { useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "../../../components/DataTable";
import { getEmployeeLogs } from "../../../services/employeeLogsApi";
import type { EmployeeLog } from "../../../types/employeeLog";

type RoleTab = "PROGRAMMER" | "OPERATOR" | "QC";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

const formatDuration = (seconds?: number) => {
  const safe = Math.max(0, Number(seconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const EmployeeLogsPanel = () => {
  const [activeRole, setActiveRole] = useState<RoleTab>("PROGRAMMER");
  const [statusFilter, setStatusFilter] = useState<"" | "COMPLETED" | "IN_PROGRESS">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getEmployeeLogs({
          role: activeRole,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        });
        setLogs(data);
      } catch (fetchError: any) {
        setError(fetchError?.message || "Failed to load employee logs");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [activeRole, statusFilter, searchQuery]);

  const columns = useMemo<Column<EmployeeLog>[]>(
    () => [
      {
        key: "employee",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <div className="employee-log-user">
            <strong>{row.userName || "Unknown User"}</strong>
            <span>{row.userEmail || "-"}</span>
          </div>
        ),
      },
      {
        key: "workItemTitle",
        label: "Work Item",
        sortable: false,
        render: (row) => (
          <div className="employee-work-item">
            <span className="ref-badge">Job #{row.refNumber || "-"}</span>
          </div>
        ),
      },
      {
        key: "jobDescription",
        label: "Description",
        sortable: false,
        render: (row) => row.jobDescription || "-",
      },
      {
        key: "quantityCount",
        label: "Quantities",
        sortable: false,
        render: (row) => {
          const computed =
            Number(row.quantityCount || 0) ||
            Number((row.metadata as any)?.quantityCount || 0) ||
            (Number(row.quantityTo || 0) && Number(row.quantityFrom || 0)
              ? Number(row.quantityTo) - Number(row.quantityFrom) + 1
              : 0);
          return computed > 0 ? computed : "-";
        },
      },
      {
        key: "startedAt",
        label: "Started At",
        sortable: false,
        render: (row) => formatDateTime(row.startedAt),
      },
      {
        key: "endedAt",
        label: "Ended At",
        sortable: false,
        render: (row) => formatDateTime(row.endedAt || null),
      },
      {
        key: "durationSeconds",
        label: "Time Taken",
        sortable: false,
        render: (row) => formatDuration(row.durationSeconds),
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (row) => (
          <span className={`employee-log-status status-${row.status.toLowerCase()}`}>
            {row.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="employee-logs-container">
      <div className="employee-logs-header">
        <div>
          <h2>Employee Logs</h2>
        </div>
      </div>

      <div className="employee-role-tabs">
        <button
          type="button"
          className={`employee-role-tab ${activeRole === "PROGRAMMER" ? "active" : ""}`}
          onClick={() => {
            setActiveRole("PROGRAMMER");
            setCurrentPage(1);
          }}
        >
          Programmer
        </button>
        <button
          type="button"
          className={`employee-role-tab ${activeRole === "OPERATOR" ? "active" : ""}`}
          onClick={() => {
            setActiveRole("OPERATOR");
            setCurrentPage(1);
          }}
        >
          Operator
        </button>
        <button
          type="button"
          className={`employee-role-tab ${activeRole === "QC" ? "active" : ""}`}
          onClick={() => {
            setActiveRole("QC");
            setCurrentPage(1);
          }}
        >
          QA
        </button>
      </div>

      <div className="employee-log-filters">
        <input
          type="text"
          className="employee-search-input"
          placeholder="Search employee, job, customer..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="employee-status-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | "COMPLETED" | "IN_PROGRESS");
            setCurrentPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
        </select>
      </div>

      {activeRole === "QC" ? (
        <div className="qa-placeholder-card">
          <h3>QA Logs</h3>
          <p>QA logging tab is ready. QA event capture wiring can be added in the next step.</p>
        </div>
      ) : loading ? (
        <div className="loading">Loading employee logs...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          emptyMessage="No logs found for the current filters."
          getRowKey={(row) => row._id}
          className="left-align"
          pagination={{
            currentPage,
            entriesPerPage,
            totalEntries: logs.length,
            onPageChange: setCurrentPage,
            onEntriesPerPageChange: (entries) => {
              setEntriesPerPage(entries);
              setCurrentPage(1);
            },
            entriesPerPageOptions: [5, 10, 15, 25, 50],
          }}
        />
      )}
    </div>
  );
};

