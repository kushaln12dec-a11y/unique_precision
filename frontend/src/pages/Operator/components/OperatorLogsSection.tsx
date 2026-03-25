import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import LazyAgGrid from "../../../components/LazyAgGrid";
import type { EmployeeLog } from "../../../types/employeeLog";
import { formatMachineLabel } from "../../../utils/jobFormatting";

type Props = {
  operatorLogSearch: string;
  setOperatorLogSearch: React.Dispatch<React.SetStateAction<string>>;
  operatorLogStatus: "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  setOperatorLogStatus: React.Dispatch<React.SetStateAction<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">>;
  operatorLogMachine: string;
  setOperatorLogMachine: React.Dispatch<React.SetStateAction<string>>;
  machineFilterOptions: string[];
  handleExportOperatorLogsCsv: () => void;
  operatorLogColumnDefs: any[];
  filterOperatorLogs: (logs: EmployeeLog[]) => EmployeeLog[];
  logsFetchPage: (offset: number, limit: number) => Promise<{ items: EmployeeLog[]; hasMore: boolean }>;
  hasOperatorLogSearch: boolean;
};

export const OperatorLogsSection: React.FC<Props> = ({
  operatorLogSearch,
  setOperatorLogSearch,
  operatorLogStatus,
  setOperatorLogStatus,
  operatorLogMachine,
  setOperatorLogMachine,
  machineFilterOptions,
  handleExportOperatorLogsCsv,
  operatorLogColumnDefs,
  filterOperatorLogs,
  logsFetchPage,
  hasOperatorLogSearch,
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
          value={operatorLogStatus}
          onChange={(e) => setOperatorLogStatus(e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
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
        rowHeight={84}
        refreshKey={`${hasOperatorLogSearch}|${operatorLogStatus}|${operatorLogMachine}`}
      />
    </>
  );
};

export default OperatorLogsSection;
