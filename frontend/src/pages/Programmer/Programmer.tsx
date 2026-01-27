import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import FilterModal, { type FilterField, type FilterValues, type FilterCategory } from "../../components/FilterModal";
import FilterButton from "../../components/FilterButton";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { getUsers } from "../../services/userApi";
import { getJobs, createJobs, deleteJobsByGroupId } from "../../services/jobApi";
import type { User } from "../../types/user";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "./programmerUtils";
import { DustbinIcon, PencilIcon } from "../../utils/icons";
import { formatDateLabel, formatDateValue, parseDateValue } from "../../utils/date";
import { applyFilters, countActiveFilters } from "../../utils/filterUtils";
import ChildCutsTable from "./components/ChildCutsTable";
import type { JobEntry } from "../../types/job";
import "./Programmer.css";

const STORAGE_KEY = "programmerJobs";

const Programmer = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const isNewJobRoute = location.pathname === "/programmer/newjob";

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getJobs();
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as JobEntry[];
            if (Array.isArray(parsed)) {
              setJobs(
                parsed.map((job) => ({
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
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await getUsers();
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const totals = useMemo(
    () => cuts.map((cut) => calculateTotals(cut)),
    [cuts]
  );

  const handleNewJob = () => {
    setEditingGroupId(null);
    setCuts([DEFAULT_CUT]);
    navigate("/programmer/newjob");
  };

  const handleCancel = () => {
    if (isNewJobRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
    setCuts([DEFAULT_CUT]);
    setEditingGroupId(null);
  };

  const handleSaveJob = async () => {
    try {
      const createdBy = getUserDisplayNameFromToken() || "User";
      const createdAt = formatDateLabel(new Date());
      const groupId = editingGroupId || Date.now();
      
      const entries: JobEntry[] = cuts.map((cut, index) => {
        const cutTotals = totals[index] ?? calculateTotals(cut);
        return {
          ...cut,
          id: groupId + index,
          groupId,
          totalHrs: cutTotals.totalHrs,
          totalAmount: cutTotals.totalAmount,
          createdAt,
          createdBy,
          assignedTo: editingGroupId 
            ? jobs.find((job) => job.groupId === editingGroupId)?.assignedTo || "Unassigned"
            : "Unassigned",
        };
      });

      if (editingGroupId) {
        // Delete existing jobs in the group
        await deleteJobsByGroupId(editingGroupId);
        // Create updated jobs
        const createdJobs = await createJobs(entries);
        setJobs((prev) => [
          ...createdJobs,
          ...prev.filter((job) => job.groupId !== editingGroupId),
        ]);
      } else {
        // Create new jobs
        const createdJobs = await createJobs(entries);
        setJobs((prev) => [...createdJobs, ...prev]);
      }
      
      handleCancel();
    } catch (error) {
      console.error("Failed to save job", error);
      alert("Failed to save job. Please try again.");
    }
  };

  const handleEditJob = (groupId: number) => {
    const groupCuts = jobs
      .filter((job) => job.groupId === groupId)
      .sort((a, b) => {
        const idA = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
        const idB = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
        return idA - idB;
      });
    if (groupCuts.length === 0) return;
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
        priority: job.priority,
        description: job.description,
        cutImage: job.cutImage ?? null,
        critical: job.critical,
        pipFinish: job.pipFinish,
      }))
    );
    setShowForm(true);
    navigate("/programmer/newjob");
  };

  const handleDeleteJob = async (groupId: number) => {
    try {
      await deleteJobsByGroupId(groupId);
      setJobs((prev) => prev.filter((job) => job.groupId !== groupId));
    } catch (error) {
      console.error("Failed to delete job", error);
      alert("Failed to delete job. Please try again.");
    }
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

  const filteredJobs = useMemo(() => {
    let result = jobs;
    
    // Apply inline filters
    if (customerFilter) {
      result = result.filter((job) =>
        job.customer?.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    
    if (createdByFilter) {
      result = result.filter((job) => job.createdBy === createdByFilter);
    }
    
    // Apply modal filters
    result = applyFilters(result, filters);
    
    return result;
  }, [jobs, filters, customerFilter, createdByFilter]);

  const groupedJobs = useMemo(() => {
    const groups = new Map<number, JobEntry[]>();
    filteredJobs.forEach((job) => {
      const key = job.groupId ?? job.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(job);
    });
    return Array.from(groups.entries()).map(([groupId, entries]) => ({
      groupId,
      entries: entries.sort((a, b) => {
        const idA = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
        const idB = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
        return idA - idB;
      }),
    }));
  }, [filteredJobs]);

  const sortedGroups = useMemo(() => {
    if (!sortField) return groupedJobs;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...groupedJobs].sort((a, b) => {
      const getValue = (group: { entries: JobEntry[] }) => {
        const first = group.entries[0];
        if (!first) return "";
        if (sortField === "createdAt") return parseDateValue(first.createdAt);
        if (sortField === "createdBy") return first.createdBy.toLowerCase();
        if (sortField === "totalHrs") {
          return group.entries.reduce((sum, entry) => sum + entry.totalHrs, 0);
        }
        if (sortField === "totalAmount") {
          return group.entries.reduce((sum, entry) => sum + entry.totalAmount, 0);
        }
        const rawValue = first[sortField];
        if (rawValue === null || rawValue === undefined) {
          return "";
        }
        if (typeof rawValue === "string") {
          return rawValue.toString().toLowerCase();
        }
        return rawValue;
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [groupedJobs, sortField, sortDirection]);

  type TableRow = {
    groupId: number;
    parent: JobEntry;
    groupTotalHrs: number;
    groupTotalAmount: number;
    entries: JobEntry[];
  };

  const tableData = useMemo<TableRow[]>(() => {
    return sortedGroups
      .map((group) => {
        const [parent] = group.entries;
        if (!parent) return null;
        return {
          groupId: group.groupId,
          parent,
          groupTotalHrs: group.entries.reduce(
            (sum, entry) => sum + (entry.totalHrs || 0),
            0
          ),
          groupTotalAmount: group.entries.reduce(
            (sum, entry) => sum + (entry.totalAmount || 0),
            0
          ),
          entries: group.entries,
        };
      })
      .filter((row): row is TableRow => row !== null);
  }, [sortedGroups]);

  const columns: Column<TableRow>[] = useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: true,
        sortKey: "customer",
        render: (row) => row.parent.customer || "—",
      },
      {
        key: "rate",
        label: "Rate",
        sortable: true,
        sortKey: "rate",
        render: (row) => `₹${Number(row.parent.rate || 0).toFixed(2)}`,
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: true,
        sortKey: "cut",
        render: (row) => Number(row.parent.cut || 0).toFixed(2),
      },
      {
        key: "thickness",
        label: "Thickness (mm)",
        sortable: true,
        sortKey: "thickness",
        render: (row) => Number(row.parent.thickness || 0).toFixed(2),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: true,
        sortKey: "passLevel",
        render: (row) => row.parent.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: true,
        sortKey: "setting",
        render: (row) => row.parent.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: true,
        sortKey: "qty",
        render: (row) => Number(row.parent.qty || 0).toString(),
      },
      {
        key: "createdAt",
        label: "Created At",
        sortable: true,
        sortKey: "createdAt",
        render: (row) => formatDateValue(row.parent.createdAt),
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: true,
        sortKey: "createdBy",
        render: (row) => row.parent.createdBy,
      },
      {
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) =>
          row.groupTotalHrs ? row.groupTotalHrs.toFixed(3) : "—",
      },
      {
        key: "totalAmount",
        label: "Total Amount (₹)",
        sortable: true,
        sortKey: "totalAmount",
        render: (row) =>
          row.groupTotalAmount
            ? `₹${row.groupTotalAmount.toFixed(2)}`
            : "—",
      },
      {
        key: "action",
        label: "Action",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => (
          <div className="action-buttons">
            <button
              type="button"
              className="action-icon-button"
              onClick={() => handleEditJob(row.groupId)}
              aria-label={`Edit ${row.parent.customer || "entry"}`}
            >
              <PencilIcon fontSize="small" />
            </button>
            <button
              type="button"
              className="action-icon-button danger"
              onClick={() => handleDeleteJob(row.groupId)}
              aria-label={`Delete ${row.parent.customer || "entry"}`}
            >
              <DustbinIcon fontSize="small" />
            </button>
          </div>
        ),
      },
    ],
    [handleEditJob, handleDeleteJob]
  );

  const expandableRows = useMemo(() => {
    const map = new Map<number, any>();
    tableData.forEach((row) => {
      const hasChildren = row.entries.length > 1;
      if (hasChildren) {
        map.set(row.groupId, {
          isExpanded: expandedGroups.has(row.groupId),
          onToggle: () => toggleGroup(row.groupId),
          expandedContent: <ChildCutsTable entries={row.entries} />,
          ariaLabel: expandedGroups.has(row.groupId)
            ? "Collapse cuts"
            : "Expand cuts",
        });
      }
    });
    return map;
  }, [tableData, expandedGroups, toggleGroup]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const filterCategories: FilterCategory[] = [
    { id: "dimensions", label: "Dimensions", icon: "📏" },
    { id: "production", label: "Production", icon: "⚙️" },
    { id: "additional", label: "Additional", icon: "⭐" },
    { id: "financial", label: "Financial", icon: "💰" },
    { id: "dates", label: "Dates", icon: "📅" },
  ];

  const filterFields: FilterField[] = [
    {
      key: "cut",
      label: "Cut (mm)",
      type: "numberRange",
      category: "dimensions",
      min: 0,
      max: 1000,
      step: 0.1,
      unit: "mm",
    },
    {
      key: "thickness",
      label: "Thickness (mm)",
      type: "numberRange",
      category: "dimensions",
      min: 0,
      max: 500,
      step: 0.1,
      unit: "mm",
    },
    {
      key: "passLevel",
      label: "Pass Level",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5" },
        { value: "6", label: "6" },
      ],
      category: "production",
    },
    {
      key: "setting",
      label: "Setting",
      type: "text",
      placeholder: "Enter setting",
      category: "production",
    },
    {
      key: "qty",
      label: "Quantity",
      type: "numberRange",
      category: "production",
      min: 0,
      max: 10000,
      step: 1,
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
      ],
      category: "additional",
    },
    {
      key: "critical",
      label: "Critical",
      type: "boolean",
      category: "additional",
    },
    {
      key: "pipFinish",
      label: "PIP Finish",
      type: "boolean",
      category: "additional",
    },
    {
      key: "sedm",
      label: "SEDM",
      type: "select",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
      category: "additional",
    },
    {
      key: "rate",
      label: "Rate (₹)",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 100000,
      step: 0.01,
      unit: "₹",
    },
    {
      key: "totalHrs",
      label: "Total Hours",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 1000,
      step: 0.001,
      unit: "hrs",
    },
    {
      key: "totalAmount",
      label: "Total Amount (₹)",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 1000000,
      step: 0.01,
      unit: "₹",
    },
    {
      key: "createdAt",
      label: "Created Date",
      type: "dateRange",
      category: "dates",
    },
  ];

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={handleNavigation} />
      <div className="programmer-content">
        <Header title="Programmer" />
        <div className="programmer-panel">
          <div className="panel-header">
            {!isNewJobRoute && (
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
                </div>
                <div className="panel-header-actions">
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
            </>
          )}

          {(isNewJobRoute || showForm) && (
            <ProgrammerJobForm
              cuts={cuts}
              setCuts={setCuts}
              onSave={handleSaveJob}
              onCancel={handleCancel}
              totals={totals}
              isAdmin={isAdmin}
            />
          )}

          {!isNewJobRoute && (
            <DataTable
              columns={columns}
              data={tableData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={(field) => handleSort(field as keyof JobEntry)}
              emptyMessage='No entries added yet. Use "New" to add an entry.'
              expandableRows={expandableRows}
              showAccordion={true}
              getRowKey={(row) => row.groupId}
              getRowClassName={(row) =>
                `group-row ${
                  expandedGroups.has(row.groupId) ? "group-row-expanded" : ""
                }`
              }
              className="jobs-table-wrapper"
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
    </div>
  );
};

export default Programmer;
