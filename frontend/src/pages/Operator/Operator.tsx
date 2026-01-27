import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import FilterModal, { type FilterField, type FilterValues, type FilterCategory } from "../../components/FilterModal";
import FilterButton from "../../components/FilterButton";
import { getUsers } from "../../services/userApi";
import { getJobs, updateJob } from "../../services/jobApi";
import type { User } from "../../types/user";
import type { JobEntry } from "../../types/job";
import { getUserRoleFromToken } from "../../utils/auth";
import { formatDateValue, parseDateValue } from "../../utils/date";
import { applyFilters, countActiveFilters } from "../../utils/filterUtils";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";

const STORAGE_KEY = "programmerJobs";

const Operator = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number | string>>(new Set());
  const [operatorUsers, setOperatorUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");

  const userRole = getUserRoleFromToken();
  const canAssign = userRole === "ADMIN" || userRole === "OPERATOR";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

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
    const fetchOperators = async () => {
      try {
        const userList = await getUsers();
        setOperatorUsers(userList.filter((user) => user.role === "OPERATOR"));
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch operators", error);
      }
    };
    if (canAssign) {
      fetchOperators();
    } else {
      const fetchUsers = async () => {
        try {
          const userList = await getUsers();
          setUsers(userList);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [canAssign]);

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
    
    if (assignedToFilter) {
      result = result.filter((job) => job.assignedTo === assignedToFilter);
    }
    
    // Apply modal filters
    result = applyFilters(result, filters);
    
    return result;
  }, [jobs, filters, customerFilter, createdByFilter, assignedToFilter]);

  const sortedJobs = useMemo(() => {
    if (!sortField) return filteredJobs;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filteredJobs].sort((a, b) => {
      const getValue = (job: JobEntry): string | number => {
        if (sortField === "createdAt") return parseDateValue(job.createdAt);
        if (sortField === "createdBy") return job.createdBy.toLowerCase();
        const fieldValue = job[sortField];
        if (fieldValue === null || fieldValue === undefined) return "";
        if (typeof fieldValue === "string") {
          return fieldValue.toLowerCase();
        }
        return fieldValue;
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA === null || valueA === undefined || valueA === "") return 1 * direction;
      if (valueB === null || valueB === undefined || valueB === "") return -1 * direction;
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [filteredJobs, sortField, sortDirection]);

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

  const handleAssignChange = async (jobId: number | string, value: string) => {
    try {
      await updateJob(String(jobId), { assignedTo: value });
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, assignedTo: value } : job))
      );
    } catch (error) {
      console.error("Failed to update job assignment", error);
      alert("Failed to update assignment. Please try again.");
    }
  };

  const handleSelectJob = (jobId: number | string) => {
    setSelectedJobIds((prev) => {
      const updated = new Set<number | string>(prev);
      if (updated.has(jobId)) {
        updated.delete(jobId);
      } else {
        updated.add(jobId);
      }
      return updated;
    });
  };

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const filterCategories: FilterCategory[] = [
    { id: "dimensions", label: "Dimensions", icon: "📏" },
    { id: "production", label: "Production", icon: "⚙️" },
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

  const columns: Column<JobEntry>[] = useMemo(
    () => [
      {
        key: "select",
        label: "",
        sortable: false,
        render: (job) => (
          <input
            type="checkbox"
            checked={selectedJobIds.has(job.id)}
            onChange={() => handleSelectJob(job.id)}
            aria-label={`Select ${job.customer || String(job.id)}`}
          />
        ),
      },
      {
        key: "customer",
        label: "Customer",
        sortable: true,
        sortKey: "customer",
        render: (job) => job.customer || "—",
      },
      {
        key: "rate",
        label: "Rate",
        sortable: true,
        sortKey: "rate",
        render: (job) => `₹${Number(job.rate || 0).toFixed(2)}`,
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: true,
        sortKey: "cut",
        render: (job) => Number(job.cut || 0).toFixed(2),
      },
      {
        key: "thickness",
        label: "Thickness (mm)",
        sortable: true,
        sortKey: "thickness",
        render: (job) => Number(job.thickness || 0).toFixed(2),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: true,
        sortKey: "passLevel",
        render: (job) => job.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: true,
        sortKey: "setting",
        render: (job) => job.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: true,
        sortKey: "qty",
        render: (job) => Number(job.qty || 0).toString(),
      },
      {
        key: "createdAt",
        label: "Created At",
        sortable: true,
        sortKey: "createdAt",
        render: (job) => formatDateValue(job.createdAt),
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: true,
        sortKey: "createdBy",
        render: (job) => job.createdBy,
      },
      {
        key: "assignedTo",
        label: "Assigned To",
        sortable: false,
        render: (job) =>
          canAssign ? (
            <select
              value={job.assignedTo || "Unassigned"}
              onChange={(event) =>
                handleAssignChange(job.id, event.target.value)
              }
            >
              <option value="Unassigned">Unassigned</option>
              {operatorUsers.map((user) => (
                <option
                  key={user._id}
                  value={`${user.firstName} ${user.lastName}`}
                >
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          ) : (
            <span>{job.assignedTo || "Unassigned"}</span>
          ),
      },
      {
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: false,
        render: (job) => (job.totalHrs ? job.totalHrs.toFixed(3) : "—"),
      },
      {
        key: "totalAmount",
        label: "Total Amount (₹)",
        sortable: false,
        render: (job) =>
          job.totalAmount ? `₹${job.totalAmount.toFixed(2)}` : "—",
      },
    ],
    [selectedJobIds, canAssign, operatorUsers]
  );

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator" />

        <div className="programmer-panel">
          <div className="panel-header">
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
              <div className="filter-group">
                <label htmlFor="assigned-to-select">Assigned To</label>
                <select
                  id="assigned-to-select"
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All</option>
                  <option value="Unassigned">Unassigned</option>
                  {operatorUsers.length > 0 ? (
                    operatorUsers.map((user) => {
                      const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                      return (
                        <option key={user._id} value={displayName}>
                          {displayName}
                        </option>
                      );
                    })
                  ) : (
                    users.map((user) => {
                      const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                      return (
                        <option key={user._id} value={displayName}>
                          {displayName}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>
            <div className="panel-header-actions">
              <FilterButton
                onClick={() => setShowFilterModal(true)}
                activeFilterCount={activeFilterCount}
              />
            </div>
          </div>
          <FilterModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            fields={filterFields}
            categories={filterCategories}
            initialValues={filters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
          <DataTable
            columns={columns}
            data={sortedJobs}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field) => handleSort(field as keyof JobEntry)}
            emptyMessage='No entries added yet.'
            getRowKey={(job) => job.id}
            className="jobs-table-wrapper"
            pagination={{
              currentPage,
              entriesPerPage: jobsPerPage,
              totalEntries: sortedJobs.length,
              onPageChange: handlePageChange,
              onEntriesPerPageChange: (entries) => {
                setJobsPerPage(entries);
                setCurrentPage(1);
              },
              entriesPerPageOptions: [5, 10, 15, 25, 50],
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Operator;
