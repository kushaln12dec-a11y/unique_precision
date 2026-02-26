import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import Toast from "../../components/Toast";
import JobDetailsModal from "../Programmer/components/JobDetailsModal";
import { OperatorFilters } from "./components/OperatorFilters";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { useOperatorTable } from "./hooks/useOperatorTable.tsx";
import { exportOperatorJobsToCSV } from "./utils/csvExport";
import { updateOperatorJob, updateOperatorQaStatus } from "../../services/operatorApi";
import { createOperatorTaskSwitchLog } from "../../services/employeeLogsApi";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { getGroupQaProgressCounts } from "./utils/qaProgress";
import type { JobEntry } from "../../types/job";
import type { FilterValues } from "../../components/FilterModal";
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

  const handleSendSelectedRowsToQa = async () => {
    if (selectedJobIds.size === 0) {
      setToast({ message: "Select at least one row to dispatch.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const selectedRows = tableData.filter((row) => selectedJobIds.has(row.groupId));
    if (selectedRows.length === 0) {
      setToast({ message: "No valid rows selected.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    try {
      await Promise.all(
        selectedRows.flatMap((row) =>
          row.entries.map((entry) => {
            const qty = Math.max(1, Number(entry.qty || 1));
            const quantityNumbers = Array.from({ length: qty }, (_, idx) => idx + 1);
            return updateOperatorQaStatus(String(entry.id), { quantityNumbers, status: "SENT_TO_QA" });
          })
        )
      );

      const selectedGroupIds = new Set(selectedRows.map((row) => row.groupId));
      setJobs((prev) =>
        prev.map((job) => {
          if (!selectedGroupIds.has(job.groupId)) return job;
          const qty = Math.max(1, Number(job.qty || 1));
          const nextStates: Record<string, "SENT_TO_QA"> = {};
          for (let i = 1; i <= qty; i += 1) nextStates[String(i)] = "SENT_TO_QA";
          return { ...job, quantityQaStates: nextStates };
        })
      );
      setSelectedJobIds(new Set());
      setToast({ message: "Selected rows moved to QA.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to move selected rows to QA.", variant: "error", visible: true });
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

  const { tableData, expandableRows } = useOperatorTableData(
    jobs,
    sortField,
    sortDirection,
    productionStageFilter,
    expandedGroups,
    toggleGroup,
    handleImageInput,
    handleAssignChange,
    operatorUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email || String(user._id),
    })),
    isAdmin
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

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator" />
        <div className="programmer-panel">
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
            onShowToast={(message, variant = "info") => {
              setToast({ message, variant, visible: true });
              setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
            }}
            onDownloadCSV={handleDownloadCSV}
            onSendSelectedRowsToQa={handleSendSelectedRowsToQa}
            selectedRowsCount={selectedJobIds.size}
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
                const c = getGroupQaProgressCounts(row.entries);
                const logged = c.saved + c.ready;
                const maxCount = Math.max(logged, c.sent, c.empty);
                if (c.sent === maxCount) return "operator-stage-row-dispatched";
                if (logged === maxCount) return "operator-stage-row-logged";
                return "operator-stage-row-not-started";
              })()
            }
            className="jobs-table-wrapper operator-table-no-scroll"
            showCheckboxes={true}
            selectedRows={selectedJobIds}
            onRowSelect={(rowKey, selected) => {
              const groupId = typeof rowKey === 'number' ? rowKey : Number(rowKey);
              if (isNaN(groupId)) return;
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
      </div>
    </div>
  );
};

export default Operator;
