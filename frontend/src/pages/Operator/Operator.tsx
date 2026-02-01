import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import FilterModal, { type FilterField, type FilterValues, type FilterCategory } from "../../components/FilterModal";
import FilterButton from "../../components/FilterButton";
import FilterBadges from "../../components/FilterBadges";
import { getUsers } from "../../services/userApi";
import { getJobs } from "../../services/jobApi";
import { updateOperatorJob } from "../../services/operatorApi";
import type { User } from "../../types/user";
import type { JobEntry } from "../../types/job";
import { getUserRoleFromToken } from "../../utils/auth";
import { formatHoursToHHMM, parseDateValue } from "../../utils/date";
import { countActiveFilters } from "../../utils/filterUtils";
import ChildCutsTable from "../Programmer/components/ChildCutsTable";
import ActionButtons from "../Programmer/components/ActionButtons";
import JobDetailsModal from "../Programmer/components/JobDetailsModal";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import DownloadIcon from "@mui/icons-material/Download";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./Operator.css";

const STORAGE_KEY = "programmerJobs";

const Operator = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    () => new Set()
  );
  const [operatorUsers, setOperatorUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());

  const userRole = getUserRoleFromToken();
  const canAssign = userRole === "ADMIN" || userRole === "OPERATOR";
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getJobs(filters, customerFilter, createdByFilter, assignedToFilter);
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
  }, [filters, customerFilter, createdByFilter, assignedToFilter]);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const userList = await getUsers();
        setOperatorUsers(userList.filter((user) => user.role === "OPERATOR" || user.role === "ADMIN"));
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
          // Fetch only ADMIN and PROGRAMMER users for Created By filter
          const userList = await getUsers(["ADMIN", "PROGRAMMER"]);
          setUsers(userList);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [canAssign]);

  // Jobs are already filtered by API, no need for client-side filtering
  const filteredJobs = useMemo(() => jobs, [jobs]);

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

  // Group jobs by groupId (like Programmer screen)
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
    if (!sortField) {
      // Default sort: newest first (by createdAt descending)
      return [...groupedJobs].sort((a, b) => {
        const dateA = parseDateValue(a.entries[0]?.createdAt || "");
        const dateB = parseDateValue(b.entries[0]?.createdAt || "");
        return dateB - dateA; // Descending (newest first)
      });
    }
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


  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
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


  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleRemoveFilter = (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer") {
        setCustomerFilter("");
      } else if (key === "createdBy") {
        setCreatedByFilter("");
      } else if (key === "assignedTo") {
        setAssignedToFilter("");
      }
    } else {
      // Modal filter
      setFilters((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    setCurrentPage(1);
  };

  const handleDownloadCSV = () => {
    const headers = ["Customer", "Rate", "Cut (mm)", "Description", "TH (MM)", "Pass", "Setting", "Qty", "Created At", "Created By", "Assigned To", "Total Hrs/Piece", "Total Amount (₹)", "Priority", "Complex"];
    const rows = tableData.map((row) => [
      row.parent.customer || "",
      `₹${Number(row.parent.rate || 0).toFixed(2)}`,
      Number(row.parent.cut || 0).toFixed(2),
      row.parent.description || "",
      Number(row.parent.thickness || 0).toFixed(2),
      row.parent.passLevel || "",
      row.parent.setting || "",
      Number(row.parent.qty || 0).toString(),
      (() => {
        const parsed = parseDateValue(row.parent.createdAt);
        if (!parsed) return "—";
        const date = new Date(parsed);
        const day = date.getDate().toString().padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${day} ${month} ${year} ${hours}:${minutes}`;
      })(),
      row.parent.createdBy || "",
      row.parent.assignedTo || "",
      row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "",
      row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : "",
      row.parent.priority || "",
      row.parent.critical ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `operator_jobs_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const handleSort = (field: keyof JobEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleViewJob = (row: TableRow) => {
    setViewingJob(row);
    setShowJobViewModal(true);
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

  const handleEditJob = (groupId: number) => {
    navigate(`/programmer/edit/${groupId}`);
  };


  const expandableRows = useMemo(() => {
    const map = new Map<number, any>();
    tableData.forEach((row) => {
      const hasChildren = row.entries.length > 1;
      if (hasChildren) {
        map.set(row.groupId, {
          isExpanded: expandedGroups.has(row.groupId),
          onToggle: () => toggleGroup(row.groupId),
          expandedContent: (
            <ChildCutsTable
              entries={row.entries}
              onEdit={undefined}
              onImage={(groupId: number, cutId?: number) => handleImageInput(groupId, cutId)}
              onAssignChange={handleAssignChange}
              operatorUsers={operatorUsers.map((user) => ({
                id: user._id,
                name: `${user.firstName} ${user.lastName}`.trim(),
              }))}
              isOperator={true}
            />
          ),
          ariaLabel: expandedGroups.has(row.groupId)
            ? "Collapse cuts"
            : "Expand cuts",
        });
      }
    });
    return map;
      }, [tableData, expandedGroups, toggleGroup, handleImageInput, handleAssignChange, operatorUsers]);

  const columns: Column<TableRow>[] = useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: true,
        sortKey: "customer",
        render: (row) => {
          const expandable = expandableRows?.get(row.groupId);
          const isExpanded = expandable?.isExpanded || false;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
              {expandable && (
                <button
                  type="button"
                  className="accordion-toggle-button operator-accordion-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    expandable.onToggle();
                  }}
                  aria-label={expandable.ariaLabel}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1a1a2e",
                    minWidth: "1rem",
                    width: "1rem",
                    transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <ArrowForwardIosSharpIcon 
                    sx={{ fontSize: "0.7rem" }}
                  />
                </button>
              )}
              {!expandable && <span style={{ width: "1rem" }} />}
              <span>{row.parent.customer || "—"}</span>
            </div>
          );
        },
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
        key: "description",
        label: "Description",
        sortable: true,
        sortKey: "description",
        render: (row) => row.parent.description || "—",
      },
      {
        key: "thickness",
        label: "TH (MM)",
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
        render: (row) => {
          // Format: "DD MMM YYYY HH:MM"
          const parsed = parseDateValue(row.parent.createdAt);
          if (!parsed) return "—";
          const date = new Date(parsed);
          const day = date.getDate().toString().padStart(2, "0");
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${day} ${month} ${year} ${hours}:${minutes}`;
        },
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: true,
        sortKey: "createdBy",
        render: (row) => row.parent.createdBy,
      },
      {
        key: "assignedTo",
        label: (
          <>
            Assigned <br /> To
          </>
        ),
        sortable: false,
        render: (row) =>
          canAssign ? (
            <select
              value={row.parent.assignedTo || "Unassigned"}
              onChange={(event) =>
                handleAssignChange(row.parent.id, event.target.value)
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
            <span>{row.parent.assignedTo || "Unassigned"}</span>
          ),
      },
      {
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) =>
          row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—",
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
          <ActionButtons
            onView={() => handleViewJob(row)}
            onSubmit={() => handleSubmit(row.groupId)}
            viewLabel={`View ${row.parent.customer || "entry"}`}
            submitLabel={`Submit ${row.parent.customer || "entry"}`}
            isOperator={true}
          />
        ),
      },
    ],
    [canAssign, operatorUsers, handleAssignChange, expandableRows, isAdmin, userRole, handleEditJob, handleViewJob, handleSubmit]
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
          <FilterBadges
            filters={filters}
            filterFields={filterFields}
            customerFilter={customerFilter}
            createdByFilter={createdByFilter}
            assignedToFilter={assignedToFilter}
            onRemoveFilter={handleRemoveFilter}
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
