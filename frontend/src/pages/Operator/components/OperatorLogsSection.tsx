import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import LazyAgGrid from "../../../components/LazyAgGrid";
import type { EmployeeLog } from "../../../types/employeeLog";
import { formatMachineLabel } from "../../../utils/jobFormatting";

type Props = {
  operatorLogSearch: string;
  setOperatorLogSearch: React.Dispatch<React.SetStateAction<string>>;
  operatorLogUser: string;
  setOperatorLogUser: React.Dispatch<React.SetStateAction<string>>;
  operatorLogStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  setOperatorLogStatus: React.Dispatch<React.SetStateAction<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">>;
  operatorLogMachine: string;
  setOperatorLogMachine: React.Dispatch<React.SetStateAction<string>>;
  userFilterOptions: string[];
  machineFilterOptions: string[];
  handleExportOperatorLogsCsv: () => void;
  operatorLogColumnDefs: any[];
  filterOperatorLogs: (logs: EmployeeLog[]) => EmployeeLog[];
  logsFetchPage: (offset: number, limit: number) => Promise<{ items: EmployeeLog[]; hasMore: boolean }>;
};

export const OperatorLogsSection: React.FC<Props> = ({
  operatorLogSearch,
  setOperatorLogSearch,
  operatorLogUser,
  setOperatorLogUser,
  operatorLogStatus,
  setOperatorLogStatus,
  operatorLogMachine,
  setOperatorLogMachine,
  userFilterOptions,
  machineFilterOptions,
  handleExportOperatorLogsCsv,
  operatorLogColumnDefs,
  filterOperatorLogs,
  logsFetchPage,
}) => {
  return (
    <>
      <div className="operator-logs-filters">
        <input
          type="text"
          value={operatorLogSearch}
          onChange={(e) => setOperatorLogSearch(e.target.value)}
          placeholder="Search any column..."
          className="filter-input operator-logs-search"
        />
        <select
          value={operatorLogUser}
          onChange={(e) => setOperatorLogUser(e.target.value)}
          className="filter-select"
        >
          <option value="">All Users</option>
          {userFilterOptions.map((userName) => (
            <option key={userName} value={userName}>
              {userName}
            </option>
          ))}
        </select>
        <select
          value={operatorLogStatus}
          onChange={(e) => setOperatorLogStatus(e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="IN_PROGRESS">RUNNING</option>
          <option value="COMPLETED">LOGGED</option>
          <option value="REJECTED">HOLD</option>
        </select>
        <select value={operatorLogMachine} onChange={(e) => setOperatorLogMachine(e.target.value)} className="filter-select">
          <option value="">All Machines</option>
          {machineFilterOptions.map((machine) => (
            <option key={machine} value={machine}>
              {formatMachineLabel(machine)}
            </option>
          ))}
        </select>
        <button className="btn-download-csv" onClick={handleExportOperatorLogsCsv} title="Download Logs CSV">
          <DownloadIcon sx={{ fontSize: "1rem" }} />
          CSV
        </button>
      </div>
      <LazyAgGrid
        columnDefs={operatorLogColumnDefs as any}
        transformRows={filterOperatorLogs}
        fetchPage={logsFetchPage}
        emptyMessage="No data available."
        getRowId={(row) => row._id}
        className="operator-logs-table logs-center"
        rowHeight={68}
        refreshKey={`${operatorLogUser}|${operatorLogStatus}|${operatorLogMachine}`}
      />
    </>
  );
};

export default OperatorLogsSection;
