import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../utils/tokenDebug";
import { getUsers } from "../../services/userApi";
import type { User } from "../../types/user";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import JobDetailsModal from "./components/JobDetailsModal";
import { ProgrammerFilters } from "./components/ProgrammerFilters";
import { MassDeleteButton } from "./components/MassDeleteButton";
import { calculateTotals } from "./programmerUtils";
import { countActiveFilters } from "../../utils/filterUtils";
import type { JobEntry } from "../../types/job";
import type { FilterValues } from "../../components/FilterModal";
import { useJobHandlers } from "./hooks/useJobHandlers";
import { useFilterHandlers } from "./hooks/useFilterHandlers";
import { useJobData } from "./hooks/useJobData";
import { useTableColumns } from "./hooks/useTableColumns";
import { useProgrammerState } from "./hooks/useProgrammerState";
import { exportJobsToCSV } from "./utils/csvExport";
import type { TableRow } from "./utils/jobDataTransform";
import { getParentRowClassName } from "./utils/priorityUtils";

const Programmer = () => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set());
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [criticalFilter, setCriticalFilter] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ groupId: number; customer: string } | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [selectedChildRows, setSelectedChildRows] = useState<Set<string | number>>(new Set());

  const isAdmin = getUserRoleFromToken() === "ADMIN";

  const handleChildRowSelect = (rowKey: string | number, selected: boolean) => {
    setSelectedChildRows((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
  };

  const {
    jobs,
    setJobs,
    showForm,
    setShowForm,
    cuts,
    setCuts,
    editingGroupId,
    setEditingGroupId,
    refNumber,
    isNewJobRoute,
    isEditRoute,
    handleNewJob: handleNewJobState,
    handleCancel: handleCancelState,
  } = useProgrammerState(filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter);

  const totals = useMemo(() => cuts.map((cut) => calculateTotals(cut)), [cuts]);

  const { handleSaveJob, handleDeleteJob, handleMassDelete, handleEditJob } = useJobHandlers({
    cuts,
    editingGroupId,
    refNumber,
    jobs,
    setJobs,
    setShowForm,
    setEditingGroupId,
    setCuts,
    setToast,
    totals,
  });

  const { handleApplyFilters, handleClearFilters, handleRemoveFilter } = useFilterHandlers({
    setFilters,
    setCustomerFilter,
    setDescriptionFilter,
    setCreatedByFilter,
  });

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

  const handleDeleteClick = (groupId: number, customer: string) => {
    setJobToDelete({ groupId, customer });
    setShowDeleteModal(true);
  };

  const { tableData, expandableRows } = useJobData({
    jobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    onEdit: handleEditJob,
    onDelete: handleDeleteClick,
    showChildCheckboxes: true,
    selectedChildRows,
    onChildRowSelect: handleChildRowSelect,
  });

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      await handleDeleteJob(jobToDelete.groupId);
      setShowDeleteModal(false);
      setJobToDelete(null);
    } catch (error) {
    }
  };

  const columns = useTableColumns({
    expandableRows,
    isAdmin,
    setViewingJob,
    setShowJobViewModal,
    handleEditJob,
    handleDeleteClick,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await getUsers(["ADMIN", "PROGRAMMER"]);
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const handleNewJob = () => {
    handleNewJobState();
    navigate("/programmer/newjob");
  };

  const handleCancel = () => {
    handleCancelState();
    if (isNewJobRoute || isEditRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
  };

  const handleRowSelect = (rowKey: string | number, selected: boolean) => {
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
  };

  const handleMassDeleteClick = async () => {
    if (selectedJobIds.size === 0) return;
    await handleMassDelete(selectedJobIds);
    setSelectedJobIds(new Set());
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setJobToDelete(null);
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
    exportJobsToCSV(tableData, isAdmin);
  };

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={(path) => navigate(path)} />
      <div className="programmer-content">
        <Header title="Programmer" />
        <div className="programmer-panel">
          {!isNewJobRoute && !isEditRoute && (
            <ProgrammerFilters
              filters={filters}
              customerFilter={customerFilter}
              descriptionFilter={descriptionFilter}
              createdByFilter={createdByFilter}
              criticalFilter={criticalFilter}
              showFilterModal={showFilterModal}
              activeFilterCount={activeFilterCount}
              users={users}
              onShowFilterModal={setShowFilterModal}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              onRemoveFilter={handleRemoveFilter}
              onCustomerFilterChange={setCustomerFilter}
              onDescriptionFilterChange={setDescriptionFilter}
              onCreatedByFilterChange={setCreatedByFilter}
              onCriticalFilterChange={setCriticalFilter}
              onDownloadCSV={handleDownloadCSV}
              onNewJob={handleNewJob}
            />
          )}

          {(isNewJobRoute || isEditRoute || showForm) && (
            <ProgrammerJobForm
              cuts={cuts}
              setCuts={setCuts}
              onSave={handleSaveJob}
              onCancel={handleCancel}
              totals={totals}
              isAdmin={isAdmin}
              refNumber={refNumber}
            />
          )}

          {!isNewJobRoute && !isEditRoute && (
            <DataTable
              columns={columns}
              data={tableData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={(field) => handleSort(field as keyof JobEntry)}
              emptyMessage='No entries added yet. Use "New" to add an entry.'
              expandableRows={expandableRows}
              showAccordion={false}
              getRowKey={(row) => row.groupId}
              getRowClassName={(row) =>
                getParentRowClassName(
                  row.parent,
                  row.entries,
                  expandedGroups.has(row.groupId)
                )
              }
              className="jobs-table-wrapper"
              showCheckboxes={true}
              selectedRows={selectedJobIds}
              onRowSelect={handleRowSelect}
              pagination={{
                currentPage,
                entriesPerPage,
                totalEntries: tableData.length,
                onPageChange: handlePageChange,
                onEntriesPerPageChange: (entries) => {
                  setEntriesPerPage(entries);
                  setCurrentPage(1);
                },
                entriesPerPageOptions: [5, 10, 15, 25, 50],
              }}
            />
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      {showDeleteModal && jobToDelete && (
        <ConfirmDeleteModal
          title="Confirm Delete"
          message="Are you sure you want to delete this job?"
          details={[
            { label: "Customer", value: jobToDelete.customer },
          ]}
          confirmButtonText="Delete Job"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

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

      <MassDeleteButton
        selectedCount={selectedJobIds.size}
        onDelete={handleMassDeleteClick}
        onClear={() => setSelectedJobIds(new Set())}
      />
    </div>
  );
};

export default Programmer;
