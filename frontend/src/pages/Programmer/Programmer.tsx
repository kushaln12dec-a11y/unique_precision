import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import FilterModal, { type FilterField, type FilterValues, type FilterCategory } from "../../components/FilterModal";
import FilterButton from "../../components/FilterButton";
import FilterBadges from "../../components/FilterBadges";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
// Import debug utility to make it available
import "../../utils/tokenDebug";
import { getUsers } from "../../services/userApi";
import { getJobs, createJobs, updateJobsByGroupId, deleteJobsByGroupId } from "../../services/jobApi";
import type { User } from "../../types/user";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import JobDetailsModal from "./components/JobDetailsModal";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "./programmerUtils";
import { DustbinIcon, PencilIcon } from "../../utils/icons";
import { formatDateLabel, formatHoursToHHMM, parseDateValue } from "../../utils/date";
import { countActiveFilters } from "../../utils/filterUtils";
import ChildCutsTable from "./components/ChildCutsTable";
import type { JobEntry } from "../../types/job";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import "./Programmer.css";

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
  const [refNumberFilter, setRefNumberFilter] = useState("");
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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Only pass criticalFilter if it's explicitly checked (true), otherwise don't filter
        const fetchedJobs = await getJobs(
          filters, 
          customerFilter, 
          createdByFilter, 
          undefined,
          criticalFilter ? true : undefined,
          refNumberFilter
        );
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        // Fallback to localStorage if API fails
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
  }, [filters, customerFilter, refNumberFilter, createdByFilter, criticalFilter]);

  // Handle URL params for editing and form visibility
  useEffect(() => {
    // Show form only if we're on newjob or edit route
    if (isEditRoute && params.groupId) {
      const groupId = Number(params.groupId);
      if (!isNaN(groupId) && groupId !== editingGroupId) {
        // Load job data for editing
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
              priority: job.priority,
              description: job.description,
              cutImage: job.cutImage ?? null,
              critical: job.critical,
              pipFinish: job.pipFinish,
              refNumber: (job as any).refNumber || "",
            }))
          );
          // Load refNumber from first job in group, or use groupId
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
      // Show form for new job route
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length === 0 || (cuts.length === 1 && !cuts[0].customer)) {
        setCuts([DEFAULT_CUT]);
      }
      setShowForm(true);
    } else {
      // Hide form when on base /programmer route (not newjob or edit)
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
        // Fetch only ADMIN and PROGRAMMER users
        const userList = await getUsers(["ADMIN", "PROGRAMMER"]);
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

  const handleSaveJob = async () => {
    try {
      const displayName = getUserDisplayNameFromToken();
      const createdBy = displayName || "Unknown User";
      const createdAt = formatDateLabel(new Date());
      const groupId = editingGroupId || Date.now();
      
      const entries: JobEntry[] = cuts.map((cut, index) => {
        const cutTotals = totals[index] ?? calculateTotals(cut);
        return {
          ...cut,
          refNumber: refNumber || String(groupId) || cut.refNumber || "",
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
        // Update existing jobs using PUT API
        const updatedJobs = await updateJobsByGroupId(editingGroupId, entries);
        setJobs((prev) => [
          ...updatedJobs,
          ...prev.filter((job) => job.groupId !== editingGroupId),
        ]);
        setToast({ message: "Job updated successfully!", variant: "success", visible: true });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
        // Reset form state first
        setShowForm(false);
        setEditingGroupId(null);
        setCuts([DEFAULT_CUT]);
        // Then navigate back to programmer list after update
        navigate("/programmer");
      } else {
        // Create new jobs
        const createdJobs = await createJobs(entries);
        setJobs((prev) => [...createdJobs, ...prev]);
        setToast({ message: "Job created successfully!", variant: "success", visible: true });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
        // Reset form state first
        setShowForm(false);
        setEditingGroupId(null);
        setCuts([DEFAULT_CUT]);
        // Then navigate back to programmer list after creation
        navigate("/programmer");
      }
    } catch (error) {
      console.error("Failed to save job", error);
      setToast({ message: "Failed to save job. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
    }
  };

  const handleEditJob = (groupId: number) => {
    navigate(`/programmer/edit/${groupId}`);
  };

  const handleDeleteClick = (groupId: number, customer: string) => {
    setJobToDelete({ groupId, customer });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJobsByGroupId(jobToDelete.groupId);
      setJobs((prev) => prev.filter((job) => job.groupId !== jobToDelete.groupId));
      setToast({ message: "Job deleted successfully!", variant: "success", visible: true });
      setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
      setShowDeleteModal(false);
      setJobToDelete(null);
    } catch (error) {
      console.error("Failed to delete job", error);
      setToast({ message: "Failed to delete job. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
    }
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

  const handleMassDelete = async () => {
    if (selectedJobIds.size === 0) return;
    
    try {
      const deletePromises = Array.from(selectedJobIds).map((groupId) =>
        deleteJobsByGroupId(groupId)
      );
      await Promise.all(deletePromises);
      
      setJobs((prev) => prev.filter((job) => !selectedJobIds.has(job.groupId)));
      setToast({ 
        message: `${selectedJobIds.size} job(s) deleted successfully!`, 
        variant: "success", 
        visible: true 
      });
      setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
      setSelectedJobIds(new Set());
    } catch (error) {
      console.error("Failed to delete jobs", error);
      setToast({ message: "Failed to delete jobs. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
    }
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

  // Jobs are already filtered by API, no need for client-side filtering
  const filteredJobs = useMemo(() => jobs, [jobs]);

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
                  className="accordion-toggle-button programmer-accordion-toggle"
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
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) =>
          row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—",
      },
      ...(isAdmin ? [{
        key: "totalAmount",
        label: "Total Amount (₹)",
        sortable: true,
        sortKey: "totalAmount",
        render: (row: TableRow) =>
          row.groupTotalAmount
            ? `₹${row.groupTotalAmount.toFixed(2)}`
            : "—",
      }] : []),
      {
        key: "action",
        label: "Action",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => (
          <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="action-icon-button"
              onClick={(e) => {
                e.stopPropagation();
                setViewingJob(row);
                setShowJobViewModal(true);
              }}
              aria-label={`View ${row.parent.customer || "entry"}`}
              title="View Details"
            >
              <VisibilityIcon fontSize="small" />
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  className="action-icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditJob(row.groupId);
                  }}
                  aria-label={`Edit ${row.parent.customer || "entry"}`}
                >
                  <PencilIcon fontSize="small" />
                </button>
                <button
                  type="button"
                  className="action-icon-button danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(row.groupId, row.parent.customer || "entry");
                  }}
                  aria-label={`Delete ${row.parent.customer || "entry"}`}
                >
                  <DustbinIcon fontSize="small" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [handleEditJob, expandableRows, isAdmin]
  );

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleRemoveFilter = (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer") {
        setCustomerFilter("");
      } else if (key === "refNumber") {
        setRefNumberFilter("");
      } else if (key === "createdBy") {
        setCreatedByFilter("");
      }
    } else {
      // Modal filter
      setFilters((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleDownloadCSV = () => {
    const headers = ["Customer", "Rate", "Cut (mm)", "Thickness (mm)", "Pass", "Setting", "Qty", "Created At", "Created By", "Total Hrs/Piece", ...(isAdmin ? ["Total Amount (₹)"] : []), "Priority", "Critical"];
    const rows = tableData.map((row) => [
      row.parent.customer || "",
      `₹${Number(row.parent.rate || 0).toFixed(2)}`,
      Number(row.parent.cut || 0).toFixed(2),
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
      row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "",
      ...(isAdmin ? [row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : ""] : []),
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
    link.setAttribute("download", `programmer_jobs_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                    <label htmlFor="ref-number-search">Ref Number</label>
                    <input
                      id="ref-number-search"
                      type="text"
                      placeholder="Search by ref number..."
                      value={refNumberFilter}
                      onChange={(e) => setRefNumberFilter(e.target.value)}
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
                      Critical
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

          {(isNewJobRoute || showForm) && (
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

          {!isNewJobRoute && (
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
                // Critical takes priority over flag
                if (row.parent.critical) {
                  classes.push("critical-row");
                } else if (row.parent.priority) {
                  // Apply priority-based colors only if not critical
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
            onClick={handleMassDelete}
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
