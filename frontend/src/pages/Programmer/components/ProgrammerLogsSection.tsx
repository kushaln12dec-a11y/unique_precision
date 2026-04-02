import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import LazyAgGrid from "../../../components/LazyAgGrid";
import type { EmployeeLog } from "../../../types/employeeLog";

type Props = {
  logSearch: string;
  setLogSearch: React.Dispatch<React.SetStateAction<string>>;
  logStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  setLogStatus: React.Dispatch<React.SetStateAction<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">>;
  logUserId: string;
  setLogUserId: React.Dispatch<React.SetStateAction<string>>;
  programmerUsers: Array<{ id: string | number; label: string }>;
  handleExportProgrammerLogsCsv: () => void;
  programmerLogColumnDefs: any[];
  filterProgrammerLogs: (logs: EmployeeLog[]) => EmployeeLog[];
  fetchPage: (offset: number, limit: number) => Promise<{ items: EmployeeLog[]; hasMore: boolean }>;
};

export const ProgrammerLogsSection: React.FC<Props> = ({
  logSearch,
  setLogSearch,
  logStatus,
  setLogStatus,
  logUserId,
  setLogUserId,
  programmerUsers,
  handleExportProgrammerLogsCsv,
  programmerLogColumnDefs,
  filterProgrammerLogs,
  fetchPage,
}) => {
  return (
    <>
      <div className="programmer-logs-filters">
        <input
          type="text"
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          placeholder="Search any column..."
          className="filter-input programmer-logs-search"
        />
        <select
          value={logStatus}
          onChange={(e) => setLogStatus(e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="IN_PROGRESS">RUNNING</option>
          <option value="COMPLETED">LOGGED</option>
          <option value="REJECTED">HOLD</option>
        </select>
        <select value={logUserId} onChange={(e) => setLogUserId(e.target.value)} className="filter-select">
          <option value="">All Users</option>
          {programmerUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
            </option>
          ))}
        </select>
        <button className="btn-download-csv" onClick={handleExportProgrammerLogsCsv} title="Download Logs CSV">
          <DownloadIcon sx={{ fontSize: "1rem" }} />
          CSV
        </button>
      </div>
      <LazyAgGrid
        columnDefs={programmerLogColumnDefs as any}
        transformRows={filterProgrammerLogs}
        fetchPage={fetchPage}
        emptyMessage="No programmer logs found."
        getRowId={(row) => row._id}
        className="jobs-table-wrapper programmer-logs-table logs-center"
        rowHeight={84}
        refreshKey={`${logStatus}|${logUserId}`}
      />
    </>
  );
};

export default ProgrammerLogsSection;
