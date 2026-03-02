import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import Toast from "../../components/Toast";
import DownloadIcon from "@mui/icons-material/Download";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
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
import { getGroupQaProgressCounts, getQaProgressCounts } from "./utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import type { JobEntry } from "../../types/job";
import type { EmployeeLog } from "../../types/employeeLog";
import type { FilterValues } from "../../components/FilterModal";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../utils/date";
import { calculateTotals } from "../Programmer/programmerUtils";
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
  const [operatorLogSearch, setOperatorLogSearch] = useState("");
  const [operatorLogStatus, setOperatorLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
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

  const isEntryReadyForQa = (entry: JobEntry): boolean => {
    const qty = Math.max(1, Number(entry.qty || 1));
    const progress = getQaProgressCounts(entry, qty);
    return progress.empty === 0 && progress.saved === 0 && progress.ready + progress.sent === qty;
  };

  const canMoveGroupToQa = (entries: JobEntry[]): boolean => {
    if (!entries.length) return false;
    const totalQty = entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.qty || 1)), 0);
    const totalReadyOrSent = entries.reduce((sum, entry) => {
      const qty = Math.max(1, Number(entry.qty || 1));
      const progress = getQaProgressCounts(entry, qty);
      return sum + progress.ready + progress.sent;
    }, 0);
    return totalQty === totalReadyOrSent && entries.every(isEntryReadyForQa);
  };

  const handleMoveGroupToQa = async (row: TableRow) => {
    if (!canMoveGroupToQa(row.entries)) {
      setToast({
        message: "All parent and child quantities must be ready for QA before moving to QC.",
        variant: "error",
        visible: true,
      });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const confirmed = window.confirm(`Move Job #${row.parent.refNumber || row.groupId} to QC?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        row.entries.map((entry) => {
          const qty = Math.max(1, Number(entry.qty || 1));
          const quantityNumbers = Array.from({ length: qty }, (_, idx) => idx + 1);
          return updateOperatorQaStatus(String(entry.id), { quantityNumbers, status: "SENT_TO_QA" });
        })
      );

      setJobs((prev) =>
        prev.map((job) => {
          if (job.groupId !== row.groupId) return job;
          const qty = Math.max(1, Number(job.qty || 1));
          const nextStates: Record<string, "SENT_TO_QA"> = {};
          for (let i = 1; i <= qty; i += 1) nextStates[String(i)] = "SENT_TO_QA";
          return { ...job, quantityQaStates: nextStates };
        })
      );
      setToast({ message: "Job moved to QC.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to move job to QC.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
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
    handleMoveGroupToQa,
    canMoveGroupToQa,
    isAdmin,
    isImageInputDisabled: isTaskTimerRunning,
  });

  const getInitials = (value: string): string => {
    const full = String(value || "").trim();
    if (!full) return "--";
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return full.slice(0, 2).toUpperCase();
  };

  const handleApplyFiltersWithPageReset = (newFilters: FilterValues) => {
    handleApplyFilters(newFilters);
  };

  const handleClearFiltersWithPageReset = () => {
    handleClearFilters();
  };

  const handleRemoveFilterWithPageReset = (key: string, type: "inline" | "modal") => {
    handleRemoveFilter(key, type);
  };

  useEffect(() => {
    if (activeTab !== "logs") return;
    let mounted = true;
    const fetchLogs = async () => {
      try {
        setLogsLoading(true);
        const logs = await getEmployeeLogs({
          role: "OPERATOR",
          status: operatorLogStatus || undefined,
          search: operatorLogSearch.trim() || undefined,
        });
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
  }, [activeTab, operatorLogSearch, operatorLogStatus]);

  const designationByUserName = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const key = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      const role = String(u.role || "").toUpperCase();
      const designation = role === "ADMIN" ? "Admin" : role === "OPERATOR" ? "Operator" : role;
      if (key) map.set(key.toLowerCase(), designation);
    });
    return map;
  }, [users]);

  const groupWedmByGroupId = useMemo(() => {
    const map = new Map<number, number>();
    const groups = new Map<number, JobEntry[]>();
    jobs.forEach((entry) => {
      const key = entry.groupId ?? Number(entry.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    groups.forEach((entries, groupId) => {
      const wedm = entries.reduce((sum, entry) => sum + calculateTotals(entry as any).wedmAmount, 0);
      map.set(groupId, wedm);
    });
    return map;
  }, [jobs]);

  const getWorkerCountForLog = (log: EmployeeLog): number => {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const opsFromMeta = String(metadata.opsName || metadata.operators || "").trim();
    if (opsFromMeta) {
      const names = opsFromMeta.split(",").map((n) => n.trim()).filter(Boolean);
      return Math.max(1, new Set(names).size);
    }

    const groupId = Number(log.jobGroupId || 0);
    if (!groupId) return 1;
    const groupEntries = jobs.filter((entry) => Number(entry.groupId) === groupId);
    if (!groupEntries.length) return 1;
    const names = groupEntries.flatMap((entry) =>
      String(entry.assignedTo || "")
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n && n !== "Unassigned")
    );
    return Math.max(1, new Set(names).size);
  };

  const getRevenueForLog = (log: EmployeeLog): string => {
    const groupId = Number(log.jobGroupId || 0);
    const wedm = groupWedmByGroupId.get(groupId) || 0;
    if (!wedm) return "-";
    const workers = getWorkerCountForLog(log);
    return `₹${(wedm / workers).toFixed(2)}`;
  };

  const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Number(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getShiftLabel = (startedAt?: string): string => {
    if (!startedAt) return "-";
    const date = new Date(startedAt);
    if (Number.isNaN(date.getTime())) return "-";
    const hour = date.getHours();
    return hour >= 6 && hour < 18 ? "Day" : "Night";
  };

  const getMachineNumberForLog = (log: EmployeeLog): string => {
    const machineFromMeta = String((log.metadata as any)?.machineNumber || "").trim();
    if (machineFromMeta) return machineFromMeta;
    const groupId = Number(log.jobGroupId || 0);
    if (!groupId) return "-";
    const groupEntries = jobs.filter((entry) => Number(entry.groupId) === groupId);
    if (!groupEntries.length) return "-";
    const firstMachine = String(groupEntries.find((entry) => String(entry.machineNumber || "").trim())?.machineNumber || "").trim();
    return firstMachine || "-";
  };

  const logsColumns = useMemo<Column<EmployeeLog>[]>(
    () => [
      {
        key: "userName",
        label: "User",
        sortable: false,
        render: (row) => {
          const name = String(row.userName || "").trim();
          const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
          return (
            <div className="log-user-stack log-user-badge-stack">
              <span className="log-user-initial-badge" title={(name || "-").toUpperCase()}>
                {getInitials(name)}
              </span>
              <span>{designation}</span>
            </div>
          );
        },
      },
      { key: "workItemTitle", label: "Work Item", sortable: false, render: (row) => row.workItemTitle || "-" },
      {
        key: "workSummary",
        label: "Summary",
        sortable: false,
        render: (row) => {
          const full = String(row.workSummary || "-");
          const short = full.length > 44 ? `${full.slice(0, 44)}...` : full;
          return <span title={full}>{short}</span>;
        },
      },
      {
        key: "startedAt",
        label: "Started at",
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.startedAt);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
      {
        key: "shift",
        label: "Shift",
        sortable: false,
        render: (row) => {
          const shift = getShiftLabel(row.startedAt);
          if (shift === "Day") {
            return (
              <span className="shift-icon-badge day" title="Day Shift">
                <WbSunnyOutlinedIcon sx={{ fontSize: "1rem" }} />
              </span>
            );
          }
          if (shift === "Night") {
            return (
              <span className="shift-icon-badge night" title="Night Shift">
                <DarkModeOutlinedIcon sx={{ fontSize: "1rem" }} />
              </span>
            );
          }
          return "-";
        },
      },
      {
        key: "machineNumber",
        label: "MACH #",
        sortable: false,
        render: (row) => getMachineNumberForLog(row),
      },
      {
        key: "endedAt",
        label: "Ended at",
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.endedAt);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
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
      {
        key: "revenue",
        label: "Revenue",
        sortable: false,
        render: (row) => getRevenueForLog(row),
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (row) => {
          const raw = String(row.status || "-").toUpperCase();
          const label =
            raw === "IN_PROGRESS"
              ? "In Progress"
              : raw
                  .split("_")
                  .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                  .join(" ");
          const statusClass =
            raw === "IN_PROGRESS" ? "in-progress" : raw === "REJECTED" ? "rejected" : "completed";
          return <span className={`log-status-badge ${statusClass}`}>{label}</span>;
        },
      },
    ],
    [designationByUserName, groupWedmByGroupId, jobs]
  );

  const handleExportOperatorLogsCsv = () => {
    const headers = [
      "User",
      "Work Item",
      "Summary",
      "Started at",
      "Shift",
      "MACH #",
      "Ended at",
      "Duration",
      "Idle Time",
      "Remark",
      "Revenue",
      "Status",
    ];

    const rows = operatorLogs.map((row) => {
      const name = String(row.userName || "").trim();
      const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
      return [
        name ? `${name} (${designation})` : designation,
        row.workItemTitle || "",
        row.workSummary || "",
        formatDisplayDateTime(row.startedAt),
        getShiftLabel(row.startedAt),
        getMachineNumberForLog(row),
        formatDisplayDateTime(row.endedAt || null),
        formatDuration(row.durationSeconds),
        String((row.metadata as any)?.idleTime || "-"),
        String((row.metadata as any)?.remark || "-"),
        getRevenueForLog(row),
        row.status || "-",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `operator_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                jobSearchFilter={customerFilter}
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
                onJobSearchFilterChange={(value) => {
                  setCustomerFilter(value);
                  setDescriptionFilter(value);
                }}
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
              />
            </>
          ) : (
            <>
              <div className="operator-logs-filters">
                <input
                  type="text"
                  value={operatorLogSearch}
                  onChange={(e) => setOperatorLogSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="filter-input operator-logs-search"
                />
                <select
                  value={operatorLogStatus}
                  onChange={(e) =>
                    setOperatorLogStatus(e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")
                  }
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button className="btn-download-csv" onClick={handleExportOperatorLogsCsv} title="Download Logs CSV">
                  <DownloadIcon sx={{ fontSize: "1rem" }} />
                  CSV
                </button>
              </div>
              <DataTable
                columns={logsColumns}
                data={operatorLogs}
                emptyMessage={logsLoading ? "Loading logs..." : "No operator logs found."}
                getRowKey={(row) => row._id}
                className="left-align operator-logs-table"
              />
            </>
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
