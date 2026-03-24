import React from "react";
import LazyAgGrid from "../../../components/LazyAgGrid";
import AppLoader from "../../../components/AppLoader";
import { OperatorFilters } from "./OperatorFilters";
import { getGroupQaProgressCounts, getQaProgressCounts } from "../utils/qaProgress";
import { getParentRowClassName, getRowClassName } from "../../Programmer/utils/priorityUtils";
import type { FilterValues } from "../../../components/FilterModal";
import type { JobEntry } from "../../../types/job";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";
import type { OperatorTableRow } from "../types";

type Props = {
  loadingJobs: boolean;
  operatorGridJobs: JobEntry[];
  filters: FilterValues;
  filterFields: any[];
  filterCategories: any[];
  customerFilter: string;
  createdByFilter: string;
  assignedToFilter: string;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  operatorUsers: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  setShowFilterModal: (show: boolean) => void;
  handleApplyFilters: (filters: FilterValues) => void;
  handleClearFilters: () => void;
  handleRemoveFilter: (key: string, type: "inline" | "modal") => void;
  setCustomerFilter: (value: string) => void;
  setDescriptionFilter: (value: string) => void;
  setCreatedByFilter: (value: string) => void;
  setAssignedToFilter: (value: string) => void;
  canUseTaskSwitchTimer: boolean;
  handleSaveTaskSwitch: (payload: { idleTime: string; remark: string; startedAt: string; endedAt: string; durationSeconds: number }) => Promise<void>;
  setIsTaskTimerRunning: (running: boolean) => void;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
  handleDownloadCSV: () => void;
  handleSendSelectedRowsToQa: () => void;
  selectedEntryIds: Set<string | number>;
  machineOptionsForDropdown: string[];
  currentUserDisplayName: string;
  handleApplyBulkAssignment: (payload: { operators: string[]; machineNumber: string }) => void;
  operatorJobColumnDefs: any[];
  fetchPage: (offset: number, limit: number) => Promise<{ items: JobEntry[]; hasMore: boolean }>;
  setOperatorGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  operatorGridRows: OperatorDisplayRow[];
  expandedGroups: Set<string>;
  createdByRefreshKey: string;
};

export const OperatorJobsSection: React.FC<Props> = ({
  loadingJobs,
  operatorGridJobs,
  filters,
  filterFields,
  filterCategories,
  customerFilter,
  createdByFilter,
  assignedToFilter,
  showFilterModal,
  activeFilterCount,
  users,
  operatorUsers,
  setShowFilterModal,
  handleApplyFilters,
  handleClearFilters,
  handleRemoveFilter,
  setCustomerFilter,
  setDescriptionFilter,
  setCreatedByFilter,
  setAssignedToFilter,
  canUseTaskSwitchTimer,
  handleSaveTaskSwitch,
  setIsTaskTimerRunning,
  setToast,
  handleDownloadCSV,
  handleSendSelectedRowsToQa,
  selectedEntryIds,
  machineOptionsForDropdown,
  currentUserDisplayName,
  handleApplyBulkAssignment,
  operatorJobColumnDefs,
  fetchPage,
  setOperatorGridJobs,
  operatorGridRows,
  expandedGroups,
  createdByRefreshKey,
}) => {
  if (loadingJobs && operatorGridJobs.length === 0) {
    return <AppLoader message="Loading operator jobs..." />;
  }

  return (
    <>
      <OperatorFilters
        filters={filters}
        filterFields={filterFields}
        filterCategories={filterCategories}
        jobSearchFilter={customerFilter}
        createdByFilter={createdByFilter}
        assignedToFilter={assignedToFilter}
        showFilterModal={showFilterModal}
        activeFilterCount={activeFilterCount}
        users={users}
        operatorUsers={operatorUsers}
        onShowFilterModal={setShowFilterModal}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onRemoveFilter={handleRemoveFilter}
        onJobSearchFilterChange={(value) => {
          setCustomerFilter(value);
          setDescriptionFilter(value);
        }}
        onCreatedByFilterChange={setCreatedByFilter}
        onAssignedToFilterChange={setAssignedToFilter}
        canUseTaskSwitchTimer={canUseTaskSwitchTimer}
        onSaveTaskSwitch={handleSaveTaskSwitch}
        onTimerRunningChange={setIsTaskTimerRunning}
        onShowToast={(message, variant = "info") => {
          setToast({ message, variant, visible: true });
          setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
        }}
        onDownloadCSV={handleDownloadCSV}
        onSendSelectedRowsToQa={handleSendSelectedRowsToQa}
        selectedRowsCount={selectedEntryIds.size}
        machineOptions={machineOptionsForDropdown}
        currentUserName={currentUserDisplayName}
        onApplyBulkAssignment={handleApplyBulkAssignment}
      />
      <LazyAgGrid
        columnDefs={operatorJobColumnDefs as any}
        fetchPage={fetchPage}
        rows={operatorGridJobs}
        onRowsChange={setOperatorGridJobs}
        transformRows={() => operatorGridRows}
        getRowId={(row: OperatorDisplayRow) =>
          row.kind === "parent" ? `parent__${row.groupId}` : `child__${row.groupId}__${row.entry.id}`
        }
        emptyMessage="No entries added yet."
        getRowClass={(params) => {
          if (params.data?.kind === "child") {
            const childFlagClass = getRowClassName([params.data.entry], false, true);
            const childCounts = getQaProgressCounts(params.data.entry, Math.max(1, Number(params.data.entry.qty || 1)));
            const childLogged = childCounts.saved + childCounts.ready;
            const childMax = Math.max(childLogged, childCounts.sent, childCounts.empty);
            let childStageClass = "operator-stage-row-not-started";
            if (childCounts.sent === childMax) childStageClass = "operator-stage-row-dispatched";
            else if (childLogged === childMax) childStageClass = "operator-stage-row-logged";
            return `${childFlagClass} ${childStageClass}`;
          }

          const row = params.data.tableRow as OperatorTableRow;
          const flagClass = getParentRowClassName(row.parent, row.entries, expandedGroups.has(row.groupId));
          const c = getGroupQaProgressCounts(row.entries);
          const logged = c.saved + c.ready;
          const maxCount = Math.max(logged, c.sent, c.empty);
          let stageClass = "operator-stage-row-not-started";
          if (c.sent === maxCount) stageClass = "operator-stage-row-dispatched";
          else if (logged === maxCount) stageClass = "operator-stage-row-logged";
          return `${flagClass} ${stageClass}`;
        }}
        className="jobs-table-wrapper operator-table-no-scroll"
        rowHeight={56}
        fitColumns={true}
        refreshKey={createdByRefreshKey}
      />
    </>
  );
};

export default OperatorJobsSection;
