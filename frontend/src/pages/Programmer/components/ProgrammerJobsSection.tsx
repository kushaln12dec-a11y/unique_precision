import React from "react";
import LazyAgGrid from "../../../components/LazyAgGrid";
import AppLoader from "../../../components/AppLoader";
import type { User } from "../../../types/user";
import type { FilterValues } from "../../../components/FilterModal";
import type { JobEntry } from "../../../types/job";
import type { ProgrammerDisplayRow } from "../hooks/useTableColumns";
import { ProgrammerFilters } from "./ProgrammerFilters";
import { getParentRowClassName, getRowClassName } from "../utils/priorityUtils";

type Props = {
  savingJob: boolean;
  loadingJobs: boolean;
  programmerGridJobs: JobEntry[];
  filters: FilterValues;
  customerFilter: string;
  createdByFilter: string;
  criticalFilter: boolean;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: User[];
  dispatchers: {
    setShowFilterModal: (show: boolean) => void;
    applyFilters: (filters: FilterValues) => void;
    clearFilters: () => void;
    removeFilter: (key: string, type: "inline" | "modal") => void;
    setCustomerDescriptionFilter: (value: string) => void;
    setCreatedByFilter: (value: string) => void;
    setCriticalFilter: (value: boolean) => void;
  };
  handleDownloadCSV: () => void;
  handleNewJob: () => void;
  fetchPage: (offset: number, limit: number) => Promise<{ items: JobEntry[]; hasMore: boolean }>;
  rows: ProgrammerDisplayRow[];
  columnDefs: any[];
  setProgrammerGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  expandedGroups: Set<string>;
  programmerGridRefreshKey: number;
  hasJobSearch: boolean;
};

export const ProgrammerJobsSection: React.FC<Props> = ({
  savingJob,
  loadingJobs,
  programmerGridJobs,
  filters,
  customerFilter,
  createdByFilter,
  criticalFilter,
  showFilterModal,
  activeFilterCount,
  users,
  dispatchers,
  handleDownloadCSV,
  handleNewJob,
  fetchPage,
  rows,
  columnDefs,
  setProgrammerGridJobs,
  expandedGroups,
  programmerGridRefreshKey,
  hasJobSearch,
}) => {
  if (savingJob) return <AppLoader message="Saving job and loading programmer jobs..." />;
  if (loadingJobs && programmerGridJobs.length === 0) return <AppLoader message="Loading programmer jobs..." />;

  return (
    <>
      <ProgrammerFilters
        filters={filters}
        jobSearchFilter={customerFilter}
        createdByFilter={createdByFilter}
        criticalFilter={criticalFilter}
        showFilterModal={showFilterModal}
        activeFilterCount={activeFilterCount}
        users={users}
        onShowFilterModal={dispatchers.setShowFilterModal}
        onApplyFilters={dispatchers.applyFilters}
        onClearFilters={dispatchers.clearFilters}
        onRemoveFilter={dispatchers.removeFilter}
        onJobSearchFilterChange={dispatchers.setCustomerDescriptionFilter}
        onCreatedByFilterChange={dispatchers.setCreatedByFilter}
        onCriticalFilterChange={dispatchers.setCriticalFilter}
        onDownloadCSV={handleDownloadCSV}
        onNewJob={handleNewJob}
      />
      <LazyAgGrid
        columnDefs={columnDefs as any}
        fetchPage={fetchPage}
        rows={programmerGridJobs}
        onRowsChange={setProgrammerGridJobs}
        transformRows={() => rows}
        getRowId={(row: ProgrammerDisplayRow) =>
          row.kind === "parent" ? `parent__${row.groupId}` : `child__${row.groupId}__${row.entry.id}`
        }
        emptyMessage="No data available."
        getRowClass={(params) => {
          if (params.data?.kind === "child") return getRowClassName([params.data.entry], false, true);
          return getParentRowClassName(
            params.data.tableRow.parent,
            params.data.tableRow.entries,
            expandedGroups.has(params.data.groupId)
          );
        }}
        className="jobs-table-wrapper"
        rowHeight={38}
        fitColumns={true}
        refreshKey={`${hasJobSearch}|${createdByFilter}|${criticalFilter}|${JSON.stringify(filters)}|${programmerGridRefreshKey}`}
      />
    </>
  );
};

export default ProgrammerJobsSection;
