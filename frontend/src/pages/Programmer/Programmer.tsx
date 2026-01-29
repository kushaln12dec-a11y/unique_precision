import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import FilterModal, { type FilterValues } from "../../components/FilterModal";
import FilterButton from "../../components/FilterButton";
import FilterBadges from "../../components/FilterBadges";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../utils/tokenDebug";
import { getUsers } from "../../services/userApi";
import { getJobs } from "../../services/jobApi";
import type { User } from "../../types/user";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import JobDetailsModal from "./components/JobDetailsModal";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "./programmerUtils";
import { countActiveFilters } from "../../utils/filterUtils";
import type { JobEntry } from "../../types/job";
import DownloadIcon from "@mui/icons-material/Download";
import "./Programmer.css";
import { filterFields, filterCategories } from "./config/filterConfig";
import { useJobHandlers } from "./hooks/useJobHandlers";
import { useFilterHandlers } from "./hooks/useFilterHandlers";
import { useJobData } from "./hooks/useJobData";
import { useTableColumns } from "./hooks/useTableColumns";
import { exportJobsToCSV } from "./utils/csvExport";
import type { TableRow } from "./utils/jobDataTransform";

const STORAGE_KEY = "programmerJobs";

const Programmer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ groupId?: string }>();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    () => new Set()
  );
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [criticalFilter, setCriticalFilter] = useState(false); // Default to unchecked - no filter
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
  const [refNumber, setRefNumber] = useState<string>("");
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const isNewJobRoute = location.pathname === "/programmer/newjob";
  const isEditRoute = location.pathname.startsWith("/programmer/edit/");

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

  const { tableData, expandableRows } = useJobData({
    jobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
  });

  const handleDeleteClick = (groupId: number, customer: string) => {
    setJobToDelete({ groupId, customer });
    setShowDeleteModal(true);
  };

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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getJobs(
          filters, 
          customerFilter, 
          createdByFilter, 
          undefined,
          criticalFilter ? true : undefined,
          descriptionFilter
        );
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as JobEntry[];
            if (Array.isArray(parsed)) {
              let filtered = parsed;
              if (criticalFilter) {
                filtered = parsed.filter((job) => job.critical === true);
              }
              setJobs(
                filtered.map((job) => ({
                  ...job,
                  assignedTo: job.assignedTo || "Unassigned",
                  groupId: job.groupId ?? job.id,
                }))
              );
            }
          } catch (parseError) {
            console.error("Failed to parse jobs from storage", parseError);
          }
        }
      }
    };
    fetchJobs();
  }, [filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter]);

  useEffect(() => {
    if (isEditRoute && params.groupId) {
      const groupId = Number(params.groupId);
      if (!isNaN(groupId) && groupId !== editingGroupId) {
        const groupCuts = jobs
          .filter((job) => job.groupId === groupId)
          .sort((a, b) => {
            const idA = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
            const idB = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
            return idA - idB;
          });
        if (groupCuts.length > 0) {
          setEditingGroupId(groupId);
              setCuts(
            groupCuts.map((job) => ({
              customer: job.customer,
              rate: job.rate,
              cut: job.cut,
              thickness: job.thickness,
              passLevel: job.passLevel,
              setting: job.setting,
              qty: job.qty,
              sedm: job.sedm,
              sedmSelectionType: job.sedmSelectionType ?? "range",
              sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
              sedmStandardValue: job.sedmStandardValue ?? "",
              sedmLengthType: job.sedmLengthType ?? "min",
              sedmOver20Length: job.sedmOver20Length ?? "",
              sedmLengthValue:
                job.sedmLengthValue ??
                (job.sedmSelectionType === "range"
                  ? job.sedmRangeKey ?? ""
                  : job.sedmStandardValue ?? ""),
              sedmHoles: job.sedmHoles ?? "1",
              sedmEntriesJson: (job as any).sedmEntriesJson ?? "",
              material: (job as any).material ?? "",
              priority: job.priority,
              description: job.description,
              cutImage: job.cutImage ?? null,
              critical: job.critical,
              pipFinish: job.pipFinish,
              refNumber: (job as any).refNumber || "",
            }))
          );
          const firstJob = groupCuts[0];
          if (firstJob && (firstJob as any).refNumber) {
            setRefNumber((firstJob as any).refNumber);
          } else {
            setRefNumber(String(groupId));
          }
          setShowForm(true);
        }
      }
    } else if (isNewJobRoute) {
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length === 0 || (cuts.length === 1 && !cuts[0].customer)) {
        setCuts([DEFAULT_CUT]);
      }
      setShowForm(true);
    } else {
      setShowForm(false);
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length > 0 && cuts[0]?.customer) {
        setCuts([DEFAULT_CUT]);
      }
    }
  }, [location.pathname, isEditRoute, params.groupId, jobs, editingGroupId, isNewJobRoute]);

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
    setEditingGroupId(null);
    setCuts([DEFAULT_CUT]);
    const newGroupId = Date.now();
    setRefNumber(String(newGroupId));
    navigate("/programmer/newjob");
  };

  const handleCancel = () => {
    if (isNewJobRoute || isEditRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
    setCuts([DEFAULT_CUT]);
    setEditingGroupId(null);
    setRefNumber("");
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
      <Sidebar currentPath="/programmer" onNavigate={handleNavigation} />
      <div className="programmer-content">
        <Header title="Programmer" />
        <div className="programmer-panel">
          <div className="panel-header">
            {!isNewJobRoute && !isEditRoute && (
              <>
                <div className="inline-filters">
                  <div className="filter-group">
                    <label htmlFor="customer-search">Customer</label>
                    <input
                      id="customer-search"
                      type="text"
                      placeholder="Search customer..."
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor="description-search">Description</label>
                    <input
                      id="description-search"
                      type="text"
                      placeholder="Search by description..."
                      value={descriptionFilter}
                      onChange={(e) => setDescriptionFilter(e.target.value)}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor="created-by-select">Created By</label>
                    <select
                      id="created-by-select"
                      value={createdByFilter}
                      onChange={(e) => setCreatedByFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">All Users</option>
                      {users.map((user) => {
                        const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                        return (
                          <option key={user._id} value={displayName}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label htmlFor="critical-filter" className="critical-filter-label">
                      <input
                        id="critical-filter"
                        type="checkbox"
                        checked={criticalFilter}
                        onChange={(e) => setCriticalFilter(e.target.checked)}
                        className="critical-checkbox"
                      />
                      Complex
                    </label>
                  </div>
                </div>
                <div className="panel-header-actions">
                  <button
                    className="btn-download-csv"
                    onClick={() => handleDownloadCSV()}
                    title="Download CSV"
                  >
                    <DownloadIcon sx={{ fontSize: "1rem" }} />
                    CSV
                  </button>
                  <FilterButton
                    onClick={() => setShowFilterModal(true)}
                    activeFilterCount={activeFilterCount}
                  />
                  <button className="btn-new-job" onClick={handleNewJob}>
                    Add New Job
                  </button>
                </div>
              </>
            )}
          </div>
          {!isNewJobRoute && (
            <>
              <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                fields={filterFields}
                categories={filterCategories}
                initialValues={filters}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
              />
              <FilterBadges
                filters={filters}
                filterFields={filterFields}
                customerFilter={customerFilter}
                createdByFilter={createdByFilter}
                onRemoveFilter={handleRemoveFilter}
              />
            </>
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
              getRowClassName={(row) => {
                const classes = ["group-row"];
                if (expandedGroups.has(row.groupId)) {
                  classes.push("group-row-expanded");
                }
                if (row.parent.critical) {
                  classes.push("critical-row");
                } else if (row.parent.priority) {
                  classes.push(`priority-row priority-${row.parent.priority.toLowerCase()}`);
                }
                return classes.join(" ");
              }}
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

      {selectedJobIds.size > 0 && isAdmin && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          background: "#ffffff",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          zIndex: 1000
        }}>
          <span>{selectedJobIds.size} job(s) selected</span>
          <button 
            className="btn-danger"
            onClick={handleMassDeleteClick}
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#ffffff",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Delete Selected
          </button>
          <button 
            onClick={() => setSelectedJobIds(new Set())}
            style={{
              background: "#64748b",
              color: "#ffffff",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Programmer;
