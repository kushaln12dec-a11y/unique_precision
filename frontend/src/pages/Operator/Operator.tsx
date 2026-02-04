import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import JobDetailsModal from "../Programmer/components/JobDetailsModal";
import { OperatorFilters } from "./components/OperatorFilters";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { useOperatorTable } from "./hooks/useOperatorTable.tsx";
import { exportOperatorJobsToCSV } from "./utils/csvExport";
import { updateOperatorJob } from "../../services/operatorApi";
import { getUserRoleFromToken } from "../../utils/auth";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => new Set());
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());

  const {
    filters,
    showFilterModal,
    setShowFilterModal,
    customerFilter,
    setCustomerFilter,
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

  const {
    jobs,
    setJobs,
    operatorUsers,
    users,
    canAssign,
  } = useOperatorData(filters, customerFilter, createdByFilter, assignedToFilter);

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
      await updateOperatorJob(String(jobId), { assignedTo: value });
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, assignedTo: value } : job))
      );
    } catch (error) {
      console.error("Failed to update job assignment", error);
      alert("Failed to update assignment. Please try again.");
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
    exportOperatorJobsToCSV(tableData);
  };

  const { tableData, expandableRows } = useOperatorTableData(
    jobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    handleImageInput,
    handleAssignChange,
    operatorUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim(),
    }))
  );

  const columns = useOperatorTable({
    tableData,
    expandableRows,
    canAssign,
    operatorUsers: operatorUsers.map((user) => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`.trim(),
    })),
    handleAssignChange,
    handleViewJob,
    handleSubmit,
    handleImageInput,
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
            createdByFilter={createdByFilter}
            assignedToFilter={assignedToFilter}
            showFilterModal={showFilterModal}
            activeFilterCount={activeFilterCount}
            users={users}
            operatorUsers={operatorUsers}
            canAssign={canAssign}
            onShowFilterModal={setShowFilterModal}
            onApplyFilters={handleApplyFiltersWithPageReset}
            onClearFilters={handleClearFiltersWithPageReset}
            onRemoveFilter={handleRemoveFilterWithPageReset}
            onCustomerFilterChange={setCustomerFilter}
            onCreatedByFilterChange={setCreatedByFilter}
            onAssignedToFilterChange={setAssignedToFilter}
            onDownloadCSV={handleDownloadCSV}
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
              getParentRowClassName(
                row.parent,
                row.entries,
                expandedGroups.has(row.groupId)
              )
            }
            className="jobs-table-wrapper"
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
      </div>
    </div>
  );
};

export default Operator;
