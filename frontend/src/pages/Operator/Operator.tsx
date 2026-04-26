import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import OperatorPageContent from "./components/OperatorPageContent";
import OperatorPageOverlays from "./components/OperatorPageOverlays";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorJobBoard } from "./hooks/useOperatorJobBoard";
import { useOperatorJobGrid } from "./hooks/useOperatorJobGrid";
import { useOperatorJobView } from "./hooks/useOperatorJobView";
import { useOperatorLogs } from "./hooks/useOperatorLogs";
import { useOperatorActions } from "./hooks/useOperatorActions";
import { useOperatorPageHandlers } from "./hooks/useOperatorPageHandlers";
import { useOperatorPageConfig } from "./hooks/useOperatorPageConfig";
import { useOperatorTable } from "./hooks/useOperatorTable";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { useOperatorDashboardActivity } from "./hooks/useOperatorDashboardActivity";
import type { JobEntry } from "../../types/job";
import type { OperatorTableRow } from "./types";
import { useJobSync } from "../../hooks/useJobSync";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./Operator.css";

const Operator = () => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserDisplayName = (getUserDisplayNameFromToken() || "USER").trim().toUpperCase();
  const [sortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [operatorGridJobs, setOperatorGridJobs] = useState<JobEntry[]>([]);
  const [isTaskTimerRunning, setIsTaskTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [operatorLogSearch, setOperatorLogSearch] = useState("");
  const [operatorLogUser, setOperatorLogUser] = useState("");
  const [operatorLogStatus, setOperatorLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
  const [operatorLogMachine, setOperatorLogMachine] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });
  const [operatorGridRefreshNonce, setOperatorGridRefreshNonce] = useState(0);
  const qaTableDataRef = useRef<OperatorTableRow[]>([]);
  const { handleViewEntry, handleViewJob, setShowJobViewModal, setViewingJob, showJobViewModal, viewingJob } =
    useOperatorJobView();

  const {
    filters,
    showFilterModal,
    setShowFilterModal,
    customerFilter,
    setCustomerFilter,
    descriptionFilter,
    setDescriptionFilter,
    createdByFilter,
    setCreatedByFilter,
    assignedToFilter,
    setAssignedToFilter,
    filterCategories,
    filterFields,
    activeFilterCount,
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter,
  } = useOperatorFilters();

  const { jobs, loadingJobs, setJobs, operatorUsers, users, canAssign, refreshJobs } = useOperatorData(
    filters,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    assignedToFilter
  );

  const refreshOperatorBoard = useCallback(() => {
    void refreshJobs();
    setOperatorGridRefreshNonce((prev) => prev + 1);
  }, [refreshJobs]);

  useJobSync((event) => {
    if (event.updatedBy && event.updatedBy === currentUserDisplayName) {
      return;
    }
    refreshOperatorBoard();
    setToast({
      message: `${event.updatedBy || "Another user"} updated jobs. Refreshing queue...`,
      variant: "info",
      visible: true,
    });
    window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
  }, activeTab === "jobs");

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const { isAdmin, canEditAssignments, canOperateInputs, canUseTaskSwitchTimer, operatorOptionUsers, machineOptionsForDropdown } = useOperatorPageConfig(
    operatorUsers,
    currentUserDisplayName,
    userRole
  );

  const { activeOperatorRuns, activeRunsByJobId, completionAlerts, operatorHistoryByJobId } = useOperatorDashboardActivity({ activeTab, operatorGridJobs });

  const {
    selectedJobIds,
    setSelectedJobIds,
    selectedEntryIds,
    setSelectedEntryIds,
    sendToQaTargets,
    setSendToQaTargets,
    isSendToQaModalOpen,
    setIsSendToQaModalOpen,
    isSendingToQa,
    handleChildRowSelect,
    openSendToQaModal,
    handleSendSelectedRowsToQa,
    handleConfirmSendToQa,
    handleDeleteSelectedRows,
    handleApplyBulkAssignment,
    handleSaveTaskSwitch,
  } = useOperatorActions({
    operatorGridJobs,
    setJobs,
    setOperatorGridJobs,
    tableDataRef: qaTableDataRef,
    setToast,
  });

  const { handleAssignChange, handleMachineNumberChange, handleChildMachineNumberChange, handleImageInput, handleSubmit } =
    useOperatorPageHandlers({ jobs, navigate, setJobs, setOperatorGridJobs, setToast, userRole });

  const { tableData } = useOperatorTableData(
    operatorGridJobs, sortField, sortDirection, expandedGroups, toggleGroup, handleImageInput,
    handleAssignChange, handleChildMachineNumberChange, operatorOptionUsers, machineOptionsForDropdown,
    isAdmin, isTaskTimerRunning, selectedEntryIds, handleChildRowSelect
  );

  const columns = useOperatorTable({
    canAssign: canEditAssignments && canAssign,
    canOperateInputs,
    machineOptions: machineOptionsForDropdown,
    operatorUsers: operatorOptionUsers,
    handleAssignChange,
    handleMachineNumberChange,
    handleChildMachineNumberChange,
    handleViewJob,
    handleViewEntry,
    handleSubmit,
    handleImageInput,
    handleOpenQaModal: openSendToQaModal,
    isAdmin,
    isImageInputDisabled: isTaskTimerRunning,
    toggleGroup,
    activeRunsByJobId,
    operatorHistoryByJobId,
  });

  const jobSearchQuery = String(customerFilter || descriptionFilter || "").trim();
  const { filteredGridTableData, operatorGridRows, operatorJobColumnDefs, hasJobSearch } = useOperatorJobGrid({
    tableData,
    expandedGroups,
    columns,
    isAdmin,
    jobSearchQuery,
    filteredTableData: tableData,
    selectedJobIds,
    selectedEntryIds,
    setSelectedJobIds,
    setSelectedEntryIds,
    handleChildRowSelect,
  });
  qaTableDataRef.current = filteredGridTableData;

  const { userFilterOptions, machineFilterOptions, filterOperatorLogs, handleExportOperatorLogsCsv, operatorLogColumnDefs, logsFetchPage } =
    useOperatorLogs({ jobs, users, machineOptionsForDropdown, operatorLogSearch, operatorLogUser, operatorLogStatus, operatorLogMachine, setToast });

  const { handleDownloadCSV, jobsFetchPage } = useOperatorJobBoard({ assignedToFilter, createdByFilter, customerFilter, descriptionFilter, filters, hasJobSearch, filteredGridTableData, isAdmin });

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator" />
        <OperatorPageContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
          fetchJobsPage={jobsFetchPage}
          setOperatorGridJobs={setOperatorGridJobs}
          operatorGridRows={operatorGridRows}
          expandedGroups={expandedGroups}
          createdByRefreshKey={`${customerFilter}|${descriptionFilter}|${createdByFilter}|${assignedToFilter}|${JSON.stringify(filters)}|${operatorGridRefreshNonce}`}
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
          activeOperatorRuns={activeOperatorRuns}
          handleOpenRunningJob={handleImageInput}
          completionAlerts={completionAlerts}
        />

        <OperatorPageOverlays
          activeTab={activeTab}
          viewingJob={viewingJob}
          showJobViewModal={showJobViewModal}
          setShowJobViewModal={setShowJobViewModal}
          setViewingJob={setViewingJob}
          getUserRole={getUserRoleFromToken}
          isSendToQaModalOpen={isSendToQaModalOpen}
          sendToQaTargets={sendToQaTargets}
          isSendingToQa={isSendingToQa}
          setIsSendToQaModalOpen={setIsSendToQaModalOpen}
          setSendToQaTargets={setSendToQaTargets}
          handleConfirmSendToQa={handleConfirmSendToQa}
          toast={toast}
          setToast={setToast}
          selectedEntryIds={selectedEntryIds}
          handleDeleteSelectedRows={handleDeleteSelectedRows}
          setSelectedEntryIds={setSelectedEntryIds}
          setSelectedJobIds={setSelectedJobIds}
        />
      </div>
    </div>
  );
};

export default Operator;
