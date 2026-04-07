import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getOperatorJobsPage } from "../../services/jobApi";
import { getEmployeeLogs } from "../../services/employeeLogsApi";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { fetchAllPaginatedItems } from "../../utils/paginationUtils";
import { getPrimaryPersonName } from "../../utils/jobFormatting";
import OperatorPageContent from "./components/OperatorPageContent";
import OperatorPageOverlays from "./components/OperatorPageOverlays";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorJobGrid } from "./hooks/useOperatorJobGrid";
import { useOperatorLogs } from "./hooks/useOperatorLogs";
import { useOperatorActions } from "./hooks/useOperatorActions";
import { useOperatorPageHandlers } from "./hooks/useOperatorPageHandlers";
import { useOperatorPageConfig } from "./hooks/useOperatorPageConfig";
import { useOperatorTable } from "./hooks/useOperatorTable";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { exportOperatorJobsToCSV } from "./utils/csvExport";
import { buildOperatorCompletionAlerts } from "./utils/completionAlerts";
import type { JobEntry } from "../../types/job";
import type { EmployeeLog } from "../../types/employeeLog";
import type { OperatorCompletionAlert, OperatorTableRow } from "./types";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./Operator.css";

const SEARCH_FETCH_PAGE_SIZE = 100;

const Operator = () => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserDisplayName = getPrimaryPersonName((getUserDisplayNameFromToken() || "").trim(), "USER");
  const [sortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [viewingJob, setViewingJob] = useState<OperatorTableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
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
  const [activeOperatorRuns, setActiveOperatorRuns] = useState<EmployeeLog[]>([]);
  const [operatorHistoryLogs, setOperatorHistoryLogs] = useState<EmployeeLog[]>([]);
  const qaTableDataRef = useRef<OperatorTableRow[]>([]);

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

  const { jobs, loadingJobs, setJobs, operatorUsers, users, canAssign } = useOperatorData(
    filters,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    assignedToFilter
  );

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

  useEffect(() => {
    let isMounted = true;
    const loadOperatorHistory = async () => {
      try {
        const logs = await getEmployeeLogs({ role: "OPERATOR", limit: 500 });
        if (!isMounted) return;
        setOperatorHistoryLogs(logs.filter((log) => String(log.jobId || "").trim()));
      } catch {
        if (isMounted) {
          setOperatorHistoryLogs([]);
        }
      }
    };

    void loadOperatorHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadActiveRuns = async () => {
      try {
        const logs = await getEmployeeLogs({ role: "OPERATOR", status: "IN_PROGRESS", limit: 250 });
        if (!isMounted) return;
        setActiveOperatorRuns(logs.filter((log) => String(log.jobId || "").trim() && !log.endedAt));
      } catch {
        if (isMounted) {
          setActiveOperatorRuns([]);
        }
      }
    };

    void loadActiveRuns();
    if (activeTab !== "jobs") {
      return () => {
        isMounted = false;
      };
    }

    const intervalId = window.setInterval(() => {
      void loadActiveRuns();
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeTab]);

  const activeRunsByJobId = useMemo(() => {
    const map = new Map<string, EmployeeLog>();
    activeOperatorRuns.forEach((log) => {
      const jobId = String(log.jobId || "").trim();
      if (!jobId) return;
      const existing = map.get(jobId);
      if (!existing || new Date(String(log.startedAt || "")).getTime() >= new Date(String(existing.startedAt || "")).getTime()) {
        map.set(jobId, log);
      }
    });
    return map;
  }, [activeOperatorRuns]);

  const completionAlerts = useMemo<OperatorCompletionAlert[]>(
    () => buildOperatorCompletionAlerts(activeOperatorRuns, operatorGridJobs),
    [activeOperatorRuns, operatorGridJobs]
  );

  const operatorHistoryByJobId = useMemo(() => {
    const map = new Map<string, string[]>();
    const sortedLogs = [...operatorHistoryLogs].sort((left, right) => {
      const leftTime = new Date(String(left.startedAt || left.createdAt || 0)).getTime();
      const rightTime = new Date(String(right.startedAt || right.createdAt || 0)).getTime();
      return leftTime - rightTime;
    });
    sortedLogs.forEach((log) => {
      const jobId = String(log.jobId || "").trim();
      const userName = getPrimaryPersonName(log.userName || "", "").toUpperCase();
      if (!jobId || !userName) return;
      const existing = map.get(jobId) || [];
      if (!existing.includes(userName)) existing.push(userName);
      map.set(jobId, existing);
    });
    return map;
  }, [operatorHistoryLogs]);

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

  const {
    handleAssignChange,
    handleMachineNumberChange,
    handleChildMachineNumberChange,
    handleImageInput,
    handleSubmit,
  } = useOperatorPageHandlers({
    jobs,
    navigate,
    setJobs,
    setOperatorGridJobs,
    setToast,
    userRole,
  });

  const { tableData } = useOperatorTableData(
    operatorGridJobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    handleImageInput,
    handleAssignChange,
    handleChildMachineNumberChange,
    operatorOptionUsers,
    machineOptionsForDropdown,
    isAdmin,
    isTaskTimerRunning,
    selectedEntryIds,
    handleChildRowSelect
  );

  const columns = useOperatorTable({
    canAssign: canEditAssignments && canAssign,
    userRole,
    canOperateInputs,
    machineOptions: machineOptionsForDropdown,
    currentUserName: currentUserDisplayName,
    operatorUsers: operatorOptionUsers,
    handleAssignChange,
    handleMachineNumberChange,
    handleChildMachineNumberChange,
    handleViewJob: (row) => {
      setViewingJob(row);
      setShowJobViewModal(true);
    },
    handleViewEntry: (entry) => {
      setViewingJob({
        groupId: String(entry.groupId),
        parent: entry,
        entries: [entry],
        groupTotalHrs: Number(entry.totalHrs || 0),
        groupTotalAmount: Number(entry.totalAmount || 0),
      });
      setShowJobViewModal(true);
    },
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

  const {
    userFilterOptions,
    machineFilterOptions,
    filterOperatorLogs,
    handleExportOperatorLogsCsv,
    operatorLogColumnDefs,
    logsFetchPage,
  } = useOperatorLogs({
    jobs,
    users,
    machineOptionsForDropdown,
    operatorLogSearch,
    operatorLogUser,
    operatorLogStatus,
    operatorLogMachine,
    setToast,
  });

  const handleDownloadCSV = useCallback(() => exportOperatorJobsToCSV(filteredGridTableData, isAdmin), [filteredGridTableData, isAdmin]);

  const jobsFetchPage = useCallback(async (offset: number, limit: number) => {
    if (hasJobSearch) {
      const items = await fetchAllPaginatedItems<JobEntry>(
        async (pageOffset, pageLimit) => {
          const page = await getOperatorJobsPage(filters, "", createdByFilter, assignedToFilter, "", {
            offset: pageOffset,
            limit: pageLimit,
          });
          return { items: page.items, hasMore: page.hasMore };
        },
        SEARCH_FETCH_PAGE_SIZE
      );
      return { items, hasMore: false };
    }
    const page = await getOperatorJobsPage(filters, customerFilter, createdByFilter, assignedToFilter, descriptionFilter, { offset, limit });
    return { items: page.items, hasMore: page.hasMore };
  }, [assignedToFilter, createdByFilter, customerFilter, descriptionFilter, filters, hasJobSearch]);

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
          createdByRefreshKey={`${customerFilter}|${descriptionFilter}|${createdByFilter}|${assignedToFilter}|${JSON.stringify(filters)}`}
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
