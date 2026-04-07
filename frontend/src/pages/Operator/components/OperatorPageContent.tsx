import type { JobEntry } from "../../../types/job";
import type { FilterValues } from "../../../components/FilterModal";
import OperatorJobsSection from "./OperatorJobsSection";
import OperatorLogsSection from "./OperatorLogsSection";
import OperatorTabs from "./OperatorTabs";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { OperatorCompletionAlert } from "../types";

type OperatorPageContentProps = {
  activeTab: "jobs" | "logs";
  setActiveTab: React.Dispatch<React.SetStateAction<"jobs" | "logs">>;
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
  users: any[];
  operatorUsers: any[];
  setShowFilterModal: (show: boolean) => void;
  handleApplyFilters: (filters: FilterValues) => void;
  handleClearFilters: () => void;
  handleRemoveFilter: (key: string, type: "inline" | "modal") => void;
  setCustomerFilter: (value: string) => void;
  setDescriptionFilter: (value: string) => void;
  setCreatedByFilter: (value: string) => void;
  setAssignedToFilter: (value: string) => void;
  canUseTaskSwitchTimer: boolean;
  canOperateInputs: boolean;
  canEditAssignments: boolean;
  handleSaveTaskSwitch: (payload: any) => Promise<void>;
  setIsTaskTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
  handleDownloadCSV: () => void;
  handleSendSelectedRowsToQa: () => void | Promise<void>;
  selectedEntryIds: Set<string | number>;
  machineOptionsForDropdown: string[];
  handleApplyBulkAssignment: (payload: { operators: string[]; machineNumber: string }) => Promise<void>;
  operatorJobColumnDefs: any[];
  fetchJobsPage: (offset: number, limit: number) => Promise<{ items: JobEntry[]; hasMore: boolean }>;
  setOperatorGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  operatorGridRows: any[];
  expandedGroups: Set<string>;
  createdByRefreshKey: string;
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
  activeOperatorRuns: EmployeeLog[];
  handleOpenRunningJob: (groupId: string, cutId?: string) => void;
  completionAlerts: OperatorCompletionAlert[];
};

const OperatorPageContent = (props: OperatorPageContentProps) => {
  const {
    activeTab,
    setActiveTab,
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
    canOperateInputs,
    canEditAssignments,
    handleSaveTaskSwitch,
    setIsTaskTimerRunning,
    setToast,
    handleDownloadCSV,
    handleSendSelectedRowsToQa,
    selectedEntryIds,
    machineOptionsForDropdown,
    handleApplyBulkAssignment,
    operatorJobColumnDefs,
    fetchJobsPage,
    setOperatorGridJobs,
    operatorGridRows,
    expandedGroups,
    createdByRefreshKey,
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
    activeOperatorRuns,
    handleOpenRunningJob,
    completionAlerts,
  } = props;

  return (
    <div className="programmer-panel">
      <OperatorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === "jobs" ? (
        <OperatorJobsSection
          loadingJobs={loadingJobs}
          operatorGridJobs={operatorGridJobs}
          filters={filters}
          filterFields={filterFields}
          filterCategories={filterCategories}
          customerFilter={customerFilter}
          createdByFilter={createdByFilter}
          assignedToFilter={assignedToFilter}
          showFilterModal={showFilterModal}
          activeFilterCount={activeFilterCount}
          users={users}
          operatorUsers={operatorUsers}
          setShowFilterModal={setShowFilterModal}
          handleApplyFilters={handleApplyFilters}
          handleClearFilters={handleClearFilters}
          handleRemoveFilter={handleRemoveFilter}
          setCustomerFilter={setCustomerFilter}
          setDescriptionFilter={setDescriptionFilter}
          setCreatedByFilter={setCreatedByFilter}
          setAssignedToFilter={setAssignedToFilter}
          canUseTaskSwitchTimer={canUseTaskSwitchTimer}
          canOperateInputs={canOperateInputs}
          canEditAssignments={canEditAssignments}
          handleSaveTaskSwitch={handleSaveTaskSwitch}
          setIsTaskTimerRunning={setIsTaskTimerRunning}
          setToast={setToast}
          handleDownloadCSV={handleDownloadCSV}
          handleSendSelectedRowsToQa={handleSendSelectedRowsToQa}
          selectedEntryIds={selectedEntryIds}
          machineOptionsForDropdown={machineOptionsForDropdown}
          handleApplyBulkAssignment={handleApplyBulkAssignment}
          operatorJobColumnDefs={operatorJobColumnDefs}
          fetchPage={fetchJobsPage}
          setOperatorGridJobs={setOperatorGridJobs}
          operatorGridRows={operatorGridRows}
          expandedGroups={expandedGroups}
          createdByRefreshKey={createdByRefreshKey}
          activeOperatorRuns={activeOperatorRuns}
          onOpenRunningJob={handleOpenRunningJob}
          completionAlerts={completionAlerts}
        />
      ) : (
        <OperatorLogsSection
          operatorLogSearch={operatorLogSearch}
          setOperatorLogSearch={setOperatorLogSearch}
          operatorLogUser={operatorLogUser}
          setOperatorLogUser={setOperatorLogUser}
          operatorLogStatus={operatorLogStatus}
          setOperatorLogStatus={setOperatorLogStatus}
          operatorLogMachine={operatorLogMachine}
          setOperatorLogMachine={setOperatorLogMachine}
          userFilterOptions={userFilterOptions}
          machineFilterOptions={machineFilterOptions}
          handleExportOperatorLogsCsv={handleExportOperatorLogsCsv}
          operatorLogColumnDefs={operatorLogColumnDefs}
          filterOperatorLogs={filterOperatorLogs}
          logsFetchPage={logsFetchPage}
        />
      )}
    </div>
  );
};

export default OperatorPageContent;
