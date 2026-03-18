import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
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
import { getMasterConfig } from "../../services/masterConfigApi";
import { createOperatorTaskSwitchLog, getEmployeeLogs } from "../../services/employeeLogsApi";
import { MassDeleteButton } from "../Programmer/components/MassDeleteButton";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { getGroupQaProgressCounts, getQaProgressCounts } from "./utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import type { JobEntry } from "../../types/job";
import type { EmployeeLog } from "../../types/employeeLog";
import type { MasterConfig } from "../../types/masterConfig";
import type { FilterValues } from "../../components/FilterModal";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../utils/date";
import {
  formatMachineLabel,
  getEmailLocalPart,
  getFirstNameDisplay,
  getInitials,
  getLogUserDisplayName,
  MACHINE_OPTIONS,
  toMachineIndex,
} from "../../utils/jobFormatting";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./Operator.css";

type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

const Operator = () => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserName = (getUserDisplayNameFromToken() || "").trim();
  const currentUserShortName = currentUserName.split(/\s+/).filter(Boolean)[0] || currentUserName;
  const isAdmin = userRole === "ADMIN";
  const canUseTaskSwitchTimer = userRole === "ADMIN" || userRole === "OPERATOR";
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string | number>>(new Set());
  const [isTaskTimerRunning, setIsTaskTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [operatorLogs, setOperatorLogs] = useState<EmployeeLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [operatorLogSearch, setOperatorLogSearch] = useState("");
  const [operatorLogStatus, setOperatorLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
  const [operatorLogMachine, setOperatorLogMachine] = useState("");
  const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
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
    loadingJobs,
    setJobs,
    operatorUsers,
    users,
    canAssign,
  } = useOperatorData(filters, customerFilter, descriptionFilter, createdByFilter, assignedToFilter);

  const toggleGroup = (groupId: string) => {
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

  const handleImageInput = (groupId: string, cutId?: number): void => {
    if (cutId) {
      navigate(`/operator/viewpage?groupId=${groupId}&cutId=${cutId}`);
    } else {
      navigate(`/operator/viewpage?groupId=${groupId}`);
    }
  };

  const handleSubmit = (groupId: string): void => {
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
        message: "All parent and child quantities must be ready for QC before moving to QC.",
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
          if (String(job.groupId) !== row.groupId) return job;
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

  const handleMachineNumberChange = async (groupId: string, machineNumber: string) => {
    try {
      const targetJobs = jobs.filter((job) => String(job.groupId) === groupId);
      if (targetJobs.length === 0) return;
      await Promise.all(
        targetJobs.map((job) =>
          updateOperatorJob(String(job.id), { machineNumber })
        )
      );
      setJobs((prev) =>
        prev.map((job) => (String(job.groupId) === groupId ? { ...job, machineNumber } : job))
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
      setToast({ message: "Selected rows moved to QC.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to move selected rows to QC.", variant: "error", visible: true });
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

  const handleChildRowSelect = (groupId: string, rowKey: string | number, selected: boolean) => {
    const normalizedKey = String(rowKey);

    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(normalizedKey);
      else next.delete(normalizedKey);

      const groupEntries = jobs.filter((job) => String(job.groupId) === groupId);
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

  const handleApplyBulkAssignment = async (payload: { operators: string[]; machineNumber: string }) => {
    if (selectedEntryIds.size === 0) {
      setToast({ message: "Select at least one row first.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const operators = [...new Set(payload.operators.map((name) => name.trim()).filter(Boolean))];
    const machineNumber = String(payload.machineNumber || "").trim();

    if (operators.length === 0 && !machineNumber) {
      setToast({ message: "Choose operator or machine to apply.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const selectedIdSet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
    const targetEntries = tableData
      .flatMap((row) => row.entries)
      .filter((entry) => selectedIdSet.has(String(entry.id)));

    if (targetEntries.length === 0) {
      setToast({ message: "No valid selected rows found.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const assignedToValue = operators.length > 0 ? operators.join(", ") : null;

    try {
      await Promise.all(
        targetEntries.map((entry) => {
          const updatePayload: Record<string, string> = {};
          if (assignedToValue !== null) updatePayload.assignedTo = assignedToValue;
          if (machineNumber) updatePayload.machineNumber = machineNumber;
          return updateOperatorJob(String(entry.id), updatePayload);
        })
      );

      setJobs((prev) =>
        prev.map((job) => {
          if (!selectedIdSet.has(String(job.id))) return job;
          return {
            ...job,
            ...(assignedToValue !== null ? { assignedTo: assignedToValue } : {}),
            ...(machineNumber ? { machineNumber } : {}),
          };
        })
      );

      setToast({
        message: `Updated ${targetEntries.length} selected row(s).`,
        variant: "success",
        visible: true,
      });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to update selected rows.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const configuredMachineOptions =
    (masterConfig?.machineOptions || [])
      .map((value) => toMachineIndex(value))
      .filter(Boolean) || [];
  const machineOptionsForDropdown =
    configuredMachineOptions.length > 0 ? configuredMachineOptions : [...MACHINE_OPTIONS];

  const operatorOptionUsers = operatorUsers.map((user) => ({
    id: user._id,
    name: getFirstNameDisplay(user.firstName, user.email, String(user._id)).toUpperCase(),
  }));

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
    operatorOptionUsers,
    machineOptionsForDropdown,
    isAdmin,
    isTaskTimerRunning,
    selectedEntryIds,
    handleChildRowSelect
  );

  const columns = useOperatorTable({
    tableData,
    expandableRows,
    canAssign,
    machineOptions: machineOptionsForDropdown,
    currentUserName: currentUserShortName,
    operatorUsers: operatorOptionUsers,
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
    const fetchMasterConfig = async () => {
      try {
        const cfg = await getMasterConfig();
        setMasterConfig(cfg);
      } catch (error) {
        console.error("Failed to fetch master config", error);
      }
    };
    fetchMasterConfig();
  }, []);

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
          machine: operatorLogMachine || undefined,
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
  }, [activeTab, operatorLogSearch, operatorLogStatus, operatorLogMachine]);

  const designationByUserName = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      const firstName = String(u.firstName || "").trim();
      const emailLocalPart = getEmailLocalPart(u.email);
      const role = String(u.role || "").toUpperCase();
      const designation = role === "ADMIN" ? "Admin" : role === "OPERATOR" ? "Operator" : role;
      if (fullName) map.set(fullName.toLowerCase(), designation);
      if (firstName) map.set(firstName.toLowerCase(), designation);
      if (emailLocalPart) map.set(emailLocalPart.toLowerCase(), designation);
    });
    return map;
  }, [users]);

  const groupWedmByGroupId = useMemo(() => {
    const map = new Map<string, number>();
    const groups = new Map<string, JobEntry[]>();
    jobs.forEach((entry) => {
      const key = String(entry.groupId ?? entry.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    });
    groups.forEach((entries, groupId) => {
      const wedm = entries.reduce(
        (sum, entry) => sum + (Number(entry.totalHrs || 0) * Number(entry.rate || 0)),
        0
      );
      map.set(groupId, wedm);
    });
    return map;
  }, [jobs]);

  const getWorkedSecondsForLog = (log: EmployeeLog): number => {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const machineHrs = Number(metadata.machineHrs || 0);
    if (Number.isFinite(machineHrs) && machineHrs > 0) {
      return Math.max(0, Math.round(machineHrs * 3600));
    }
    return Math.max(0, Number(log.durationSeconds || 0));
  };

  const groupWorkedSecondsByGroupId = useMemo(() => {
    const map = new Map<string, number>();
    operatorLogs.forEach((log) => {
      const groupId = String(log.jobGroupId || "").trim();
      if (!groupId) return;
      if (String(log.role || "").toUpperCase() !== "OPERATOR") return;
      const workedSeconds = getWorkedSecondsForLog(log);
      map.set(groupId, (map.get(groupId) || 0) + workedSeconds);
    });
    return map;
  }, [operatorLogs]);

  const getRevenueForLog = (log: EmployeeLog): string => {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const explicitRevenue = metadata.revenue;
    if (
      explicitRevenue !== undefined &&
      explicitRevenue !== null &&
      String(explicitRevenue).trim() !== ""
    ) {
      const numericValue = Number(explicitRevenue);
      if (Number.isFinite(numericValue)) {
        return `Rs. ${Math.round(numericValue)}`;
      }
      return String(explicitRevenue);
    }

    const groupId = String(log.jobGroupId || "").trim();
    const wedm = groupId ? groupWedmByGroupId.get(groupId) || 0 : 0;
    if (!wedm) return "-";
    const totalWorkedSeconds = groupWorkedSecondsByGroupId.get(groupId) || 0;
    if (!totalWorkedSeconds) return "-";
    const workedSeconds = getWorkedSecondsForLog(log);
    const share = Math.max(0, workedSeconds) / totalWorkedSeconds;
    return `Rs. ${Math.round(wedm * share)}`;
  };

  const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Number(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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
    if (machineFromMeta) return toMachineIndex(machineFromMeta);
    const groupId = String(log.jobGroupId || "").trim();
    if (!groupId) return "-";
    const groupEntries = jobs.filter((entry) => String(entry.groupId) === groupId);
    if (!groupEntries.length) return "-";
    const firstMachine = String(
      groupEntries.find((entry) => String(entry.machineNumber || "").trim())?.machineNumber || ""
    ).trim();
    return toMachineIndex(firstMachine) || "-";
  };

  const machineFilterOptions = useMemo(() => {
    const unique = new Set<string>();
    operatorLogs.forEach((log) => {
      const machine = getMachineNumberForLog(log);
      if (machine && machine !== "-") unique.add(machine);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [operatorLogs, jobs]);

  const logsColumns = useMemo<Column<EmployeeLog>[]>(
    () => [
      {
        key: "userName",
        label: "User",
        sortable: false,
        render: (row) => {
          const name = getLogUserDisplayName(row.userName, row.userEmail, "Operator");
          const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
          return (
            <div className="log-user-stack log-user-badge-stack">
              <span className="log-user-initial-badge" title={name.toUpperCase()}>
                {getInitials(name)}
              </span>
              <span>{designation}</span>
            </div>
          );
        },
      },
      {
        key: "machineNumber",
        label: "MACH #",
        sortable: false,
        render: (row) => formatMachineLabel(getMachineNumberForLog(row)),
      },
      { key: "workItemTitle", label: "Work Item", sortable: false, render: (row) => row.workItemTitle || "-" },
      {
        key: "workSummary",
        label: "Summary",
        sortable: false,
        render: (row) => {
          const full = String(row.workSummary || "-");
          return <MarqueeCopyText text={full} />;
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
        render: (row) => <span className="log-revenue-value">{getRevenueForLog(row)}</span>,
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
    [designationByUserName, groupWedmByGroupId, groupWorkedSecondsByGroupId, jobs]
  );

  const handleExportOperatorLogsCsv = () => {
    const headers = [
      "User",
      "MACH #",
      "Work Item",
      "Summary",
      "Started at",
      "Ended at",
      "Shift",
      "Duration",
      "Idle Time",
      "Remark",
      "Revenue",
      "Status",
    ];

    const rows = operatorLogs.map((row) => {
      const name = getLogUserDisplayName(row.userName, row.userEmail, "");
      const designation = designationByUserName.get(name.toLowerCase()) || "Operator";
      return [
        name ? `${name} (${designation})` : designation,
        formatMachineLabel(getMachineNumberForLog(row)),
        row.workItemTitle || "",
        row.workSummary || "",
        formatDisplayDateTime(row.startedAt),
        formatDisplayDateTime(row.endedAt || null),
        getShiftLabel(row.startedAt),
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
              {loadingJobs ? (
                <AppLoader message="Loading operator jobs..." />
              ) : (
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
                    machineOptions={machineOptionsForDropdown}
                    currentUserName={currentUserShortName}
                    onApplyBulkAssignment={handleApplyBulkAssignment}
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
                      const groupId = String(rowKey);
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
              )}
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
                <select
                  value={operatorLogMachine}
                  onChange={(e) => setOperatorLogMachine(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Machines</option>
                  {machineFilterOptions.map((machine) => (
                    <option key={machine} value={machine}>
                      {formatMachineLabel(machine)}
                    </option>
                  ))}
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
