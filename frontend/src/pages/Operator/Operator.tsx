import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import Toast from "../../components/Toast";
import JobDetailsModal from "../Programmer/components/JobDetailsModal";
import { OperatorFilters } from "./components/OperatorFilters";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { useOperatorTable } from "./hooks/useOperatorTable.tsx";
import { exportOperatorJobsToCSV } from "./utils/csvExport";
import { updateOperatorJob, updateOperatorQaStatus } from "../../services/operatorApi";
import { deleteJob } from "../../services/jobApi";
import { createOperatorTaskSwitchLog, getEmployeeLogs } from "../../services/employeeLogsApi";
import { MassDeleteButton } from "../Programmer/components/MassDeleteButton";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { getGroupQaProgressCounts } from "./utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import type { JobEntry } from "../../types/job";
import type { EmployeeLog } from "../../types/employeeLog";
import type { FilterValues } from "../../components/FilterModal";
import { formatDisplayDateTime } from "../../utils/date";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./Operator.css";

type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

const Operator = () => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserName = (getUserDisplayNameFromToken() || "").trim();
  const isAdmin = userRole === "ADMIN";
  const canUseTaskSwitchTimer = userRole === "ADMIN" || userRole === "OPERATOR";
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set());
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string | number>>(new Set());
  const [isTaskTimerRunning, setIsTaskTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [operatorLogs, setOperatorLogs] = useState<EmployeeLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });

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
    productionStageFilter,
    setProductionStageFilter,
    filterCategories,
    filterFields,
    activeFilterCount,
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter,
  } = useOperatorFilters();

  const {
    jobs,
    setJobs,
    operatorUsers,
    users,
    canAssign,
  } = useOperatorData(filters, customerFilter, descriptionFilter, createdByFilter, assignedToFilter);

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleAssignChange = async (jobId: number | string, value: string) => {
    try {
      // Store as comma-separated string (backend can handle this)
      await updateOperatorJob(String(jobId), { assignedTo: value });
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, assignedTo: value } : job))
      );
    } catch (error) {
      console.error("Failed to update job assignment", error);
      setToast({ message: "Failed to update assignment. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleImageInput = (groupId: number, cutId?: number): void => {
    if (cutId) {
      navigate(`/operator/viewpage?groupId=${groupId}&cutId=${cutId}`);
    } else {
      navigate(`/operator/viewpage?groupId=${groupId}`);
    }
  };

  const handleSubmit = (groupId: number): void => {
    navigate(`/operator/viewpage?groupId=${groupId}`);
  };

  const handleViewJob = (row: TableRow) => {
    setViewingJob(row);
    setShowJobViewModal(true);
  };

  const handleSort = (field: keyof JobEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleDownloadCSV = () => {
    exportOperatorJobsToCSV(tableData, isAdmin);
  };

  const handleMachineNumberChange = async (groupId: number, machineNumber: string) => {
    try {
      const targetJobs = jobs.filter((job) => job.groupId === groupId);
      if (targetJobs.length === 0) return;
      await Promise.all(
        targetJobs.map((job) =>
          updateOperatorJob(String(job.id), { machineNumber })
        )
      );
      setJobs((prev) =>
        prev.map((job) => (job.groupId === groupId ? { ...job, machineNumber } : job))
      );
    } catch (error) {
      setToast({ message: "Failed to update machine number.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleChildMachineNumberChange = async (jobId: number | string, machineNumber: string) => {
    try {
      await updateOperatorJob(String(jobId), { machineNumber });
      setJobs((prev) =>
        prev.map((job) => (String(job.id) === String(jobId) ? { ...job, machineNumber } : job))
      );
    } catch (error) {
      setToast({ message: "Failed to update machine number.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleSendSelectedRowsToQa = async () => {
    if (selectedEntryIds.size === 0) {
      setToast({ message: "Select at least one row to dispatch.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const selectedKeySet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
    const selectedEntries = tableData
      .flatMap((row) => row.entries)
      .filter((entry) => selectedKeySet.has(String(entry.id)));

    if (selectedEntries.length === 0) {
      setToast({ message: "No valid rows selected.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    try {
      await Promise.all(
        selectedEntries.map((entry) => {
          const qty = Math.max(1, Number(entry.qty || 1));
          const quantityNumbers = Array.from({ length: qty }, (_, idx) => idx + 1);
          return updateOperatorQaStatus(String(entry.id), { quantityNumbers, status: "SENT_TO_QA" });
        })
      );

      const selectedIdSet = new Set(selectedEntries.map((entry) => String(entry.id)));
      setJobs((prev) =>
        prev.map((job) => {
          if (!selectedIdSet.has(String(job.id))) return job;
          const qty = Math.max(1, Number(job.qty || 1));
          const nextStates: Record<string, "SENT_TO_QA"> = {};
          for (let i = 1; i <= qty; i += 1) nextStates[String(i)] = "SENT_TO_QA";
          return { ...job, quantityQaStates: nextStates };
        })
      );
      setSelectedEntryIds(new Set());
      setSelectedJobIds(new Set());
      setToast({ message: "Selected rows moved to QA.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to move selected rows to QA.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedEntryIds.size === 0) {
      setToast({ message: "Select at least one row to delete.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    try {
      const selectedIdSet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
      await Promise.all(Array.from(selectedIdSet).map((id) => deleteJob(id)));

      setJobs((prev) => prev.filter((job) => !selectedIdSet.has(String(job.id))));
      setSelectedEntryIds(new Set());
      setSelectedJobIds(new Set());
      setToast({ message: "Selected rows deleted.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to delete selected rows.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleSaveTaskSwitch = async (payload: {
    idleTime: string;
    remark: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }) => {
    await createOperatorTaskSwitchLog(payload);
  };

  const handleChildRowSelect = (groupId: number, rowKey: string | number, selected: boolean) => {
    const normalizedKey = String(rowKey);

    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(normalizedKey);
      else next.delete(normalizedKey);

      const groupEntries = jobs.filter((job) => job.groupId === groupId);
      const allGroupEntryKeys = groupEntries
        .map((entry) => (entry.id === undefined || entry.id === null ? null : String(entry.id)))
        .filter((key): key is string => key !== null);

      setSelectedJobIds((prevGroups) => {
        const nextGroups = new Set(prevGroups);
        const allSelected = allGroupEntryKeys.length > 0 && allGroupEntryKeys.every((key) => next.has(key));
        if (allSelected) nextGroups.add(groupId);
        else nextGroups.delete(groupId);
        return nextGroups;
      });

      return next;
    });
  };

  const { tableData, expandableRows } = useOperatorTableData(
    jobs,
    sortField,
    sortDirection,
    productionStageFilter,
    expandedGroups,
    toggleGroup,
    handleImageInput,
    handleAssignChange,
    handleChildMachineNumberChange,
    operatorUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email || String(user._id),
    })),
    isAdmin,
    isTaskTimerRunning,
    selectedEntryIds,
    handleChildRowSelect
  );

  const columns = useOperatorTable({
    tableData,
    expandableRows,
    canAssign,
    currentUserName,
    operatorUsers: operatorUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email || String(user._id),
    })),
    handleAssignChange,
    handleMachineNumberChange,
    handleViewJob,
    handleSubmit,
    handleImageInput,
    isAdmin,
    isImageInputDisabled: isTaskTimerRunning,
  });

  const handleApplyFiltersWithPageReset = (newFilters: FilterValues) => {
    handleApplyFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFiltersWithPageReset = () => {
    handleClearFilters();
    setCurrentPage(1);
  };

  const handleRemoveFilterWithPageReset = (key: string, type: "inline" | "modal") => {
    handleRemoveFilter(key, type);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (activeTab !== "logs") return;
    let mounted = true;
    const fetchLogs = async () => {
      try {
        setLogsLoading(true);
        const logs = await getEmployeeLogs({ role: "OPERATOR" });
        if (mounted) setOperatorLogs(logs);
      } catch (error) {
        if (mounted) {
          setOperatorLogs([]);
          setToast({ message: "Failed to fetch operator logs.", variant: "error", visible: true });
          setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
        }
      } finally {
        if (mounted) setLogsLoading(false);
      }
    };
    fetchLogs();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Number(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const logsColumns = useMemo<Column<EmployeeLog>[]>(
    () => [
      { key: "userName", label: "Operator", sortable: false, render: (row) => row.userName || "-" },
      { key: "workItemTitle", label: "Work Item", sortable: false, render: (row) => row.workItemTitle || "-" },
      { key: "workSummary", label: "Summary", sortable: false, render: (row) => row.workSummary || "-" },
      { key: "startedAt", label: "Started", sortable: false, render: (row) => formatDisplayDateTime(row.startedAt) },
      { key: "endedAt", label: "Ended", sortable: false, render: (row) => formatDisplayDateTime(row.endedAt) },
      { key: "durationSeconds", label: "Duration", sortable: false, render: (row) => formatDuration(row.durationSeconds) },
      {
        key: "idleTime",
        label: "Idle Time",
        sortable: false,
        render: (row) => String((row.metadata as any)?.idleTime || "-"),
      },
      {
        key: "remark",
        label: "Remark",
        sortable: false,
        render: (row) => String((row.metadata as any)?.remark || "-"),
      },
      { key: "status", label: "Status", sortable: false, render: (row) => row.status || "-" },
    ],
    []
  );

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator" />
        <div className="programmer-panel">
          <div className="operator-subtabs">
            <button
              type="button"
              className={`operator-subtab ${activeTab === "jobs" ? "active" : ""}`}
              onClick={() => setActiveTab("jobs")}
            >
              Jobs
            </button>
            <button
              type="button"
              className={`operator-subtab ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
          </div>

          {activeTab === "jobs" ? (
            <>
              <OperatorFilters
                filters={filters}
                filterFields={filterFields}
                filterCategories={filterCategories}
                customerFilter={customerFilter}
                descriptionFilter={descriptionFilter}
                createdByFilter={createdByFilter}
                assignedToFilter={assignedToFilter}
                productionStageFilter={productionStageFilter}
                showFilterModal={showFilterModal}
                activeFilterCount={activeFilterCount}
                users={users}
                operatorUsers={operatorUsers}
                onShowFilterModal={setShowFilterModal}
                onApplyFilters={handleApplyFiltersWithPageReset}
                onClearFilters={handleClearFiltersWithPageReset}
                onRemoveFilter={handleRemoveFilterWithPageReset}
                onCustomerFilterChange={setCustomerFilter}
                onDescriptionFilterChange={setDescriptionFilter}
                onCreatedByFilterChange={setCreatedByFilter}
                onAssignedToFilterChange={setAssignedToFilter}
                onProductionStageFilterChange={setProductionStageFilter}
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
              />
              <DataTable
                columns={columns}
                data={tableData}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={(field) => handleSort(field as keyof JobEntry)}
                emptyMessage='No entries added yet.'
                expandableRows={expandableRows}
                showAccordion={false}
                getRowKey={(row) => row.groupId}
                getRowClassName={(row) =>
                  (() => {
                    const flagClass = getParentRowClassName(
                      row.parent,
                      row.entries,
                      expandedGroups.has(row.groupId)
                    );
                    const c = getGroupQaProgressCounts(row.entries);
                    const logged = c.saved + c.ready;
                    const maxCount = Math.max(logged, c.sent, c.empty);
                    let stageClass = "operator-stage-row-not-started";
                    if (c.sent === maxCount) stageClass = "operator-stage-row-dispatched";
                    else if (logged === maxCount) stageClass = "operator-stage-row-logged";
                    return `${flagClass} ${stageClass}`;
                  })()
                }
                className="jobs-table-wrapper operator-table-no-scroll"
                showCheckboxes={true}
                selectedRows={selectedJobIds}
                onRowSelect={(rowKey, selected) => {
                  const groupId = typeof rowKey === 'number' ? rowKey : Number(rowKey);
                  if (isNaN(groupId)) return;
                  const row = tableData.find((r) => r.groupId === groupId);
                  if (!row) return;

                  setSelectedEntryIds((prev) => {
                    const next = new Set(prev);
                    row.entries.forEach((entry) => {
                      if (entry.id === undefined || entry.id === null) return;
                      const key = String(entry.id);
                      if (selected) next.add(key);
                      else next.delete(key);
                    });
                    return next;
                  });

                  setSelectedJobIds((prev) => {
                    const next = new Set(prev);
                    if (selected) {
                      next.add(groupId);
                    } else {
                      next.delete(groupId);
                    }
                    return next;
                  });
                }}
                pagination={{
                  currentPage,
                  entriesPerPage: jobsPerPage,
                  totalEntries: tableData.length,
                  onPageChange: handlePageChange,
                  onEntriesPerPageChange: (entries) => {
                    setJobsPerPage(entries);
                    setCurrentPage(1);
                  },
                  entriesPerPageOptions: [5, 10, 15, 25, 50],
                }}
              />
            </>
          ) : (
            <DataTable
              columns={logsColumns}
              data={operatorLogs}
              emptyMessage={logsLoading ? "Loading logs..." : "No operator logs found."}
              getRowKey={(row) => row._id}
              className="left-align operator-logs-table"
            />
          )}
        </div>

        {showJobViewModal && viewingJob && (
          <JobDetailsModal
            job={viewingJob}
            userRole={getUserRoleFromToken()}
            onClose={() => {
              setShowJobViewModal(false);
              setViewingJob(null);
            }}
          />
        )}
        <Toast
          message={toast.message}
          visible={toast.visible}
          variant={toast.variant}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
        {activeTab === "jobs" && (
          <MassDeleteButton
            selectedCount={selectedEntryIds.size}
            onDelete={handleDeleteSelectedRows}
            onClear={() => {
              setSelectedEntryIds(new Set());
              setSelectedJobIds(new Set());
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Operator;
