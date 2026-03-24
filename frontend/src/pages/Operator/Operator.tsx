import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import type { Column } from "../../components/DataTable";
import LazyAgGrid from "../../components/LazyAgGrid";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import DownloadIcon from "@mui/icons-material/Download";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import JobDetailsModal from "../Programmer/components/JobDetailsModal";
import { OperatorFilters } from "./components/OperatorFilters";
import SendToQaModal, { type SendToQaModalTarget } from "./components/SendToQaModal";
import { useOperatorData } from "./hooks/useOperatorData";
import { useOperatorFilters } from "./hooks/useOperatorFilters";
import { useOperatorTableData } from "./hooks/useOperatorTableData.tsx";
import { useOperatorTable, type OperatorDisplayRow } from "./hooks/useOperatorTable.tsx";
import { exportOperatorJobsToCSV } from "./utils/csvExport";
import { updateOperatorJob, updateOperatorQaStatus } from "../../services/operatorApi";
import { deleteJob, getOperatorJobsPage } from "../../services/jobApi";
import { getMasterConfig } from "../../services/masterConfigApi";
import { createOperatorTaskSwitchLog, getEmployeeLogsPage } from "../../services/employeeLogsApi";
import { MassDeleteButton } from "../Programmer/components/MassDeleteButton";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import { getDispatchableQuantityNumbers, getGroupQaProgressCounts, getQaProgressCounts, getQuantityProgressStatuses } from "./utils/qaProgress";
import { getParentRowClassName, getRowClassName } from "../Programmer/utils/priorityUtils";
import type { JobEntry } from "../../types/job";
import type { EmployeeLog } from "../../types/employeeLog";
import type { MasterConfig } from "../../types/masterConfig";
import type { FilterValues } from "../../components/FilterModal";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../utils/date";
import {
  estimatedHoursFromAmount,
  formatEstimatedTime,
  formatMachineLabel,
  getDisplayName,
  getEmailLocalPart,
  getInitials,
  getLogUserDisplayName,
  MACHINE_OPTIONS,
  formatJobRefDisplay,
  toMachineIndex,
  toYN,
} from "../../utils/jobFormatting";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import { getThicknessDisplayValue } from "../Programmer/programmerUtils";
import { fetchAllPaginatedItems } from "../../utils/paginationUtils";
import { matchesSearchQuery } from "../../utils/searchUtils";
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

const getOperatorHeaderName = (column: Column<OperatorDisplayRow>) => {
  if (typeof column.label === "string") return column.label;
  switch (column.key) {
    case "programRef":
      return "JOB REF";
    case "programRefFileName":
      return "PROGRAM REF FILE NAME";
    case "machineNumber":
      return "MACH #";
    case "estimatedTime":
      return "ESTIMATED TIME";
    case "totalAmount":
      return "AMOUNT (RS.)";
    case "productionStage":
      return "STATUS";
    case "createdBy":
      return "CREATED BY";
    default:
      return String(column.key);
  }
};

const OPERATOR_GRID_COLUMN_WIDTHS: Record<string, number> = {
  customer: 92,
  programRef: 84,
  programRefFileName: 108,
  description: 118,
  cut: 62,
  thickness: 62,
  passLevel: 48,
  setting: 56,
  qty: 44,
  sedm: 50,
  assignedTo: 128,
  machineNumber: 88,
  estimatedTime: 76,
  totalAmount: 84,
  productionStage: 88,
  createdBy: 68,
  action: 70,
};

const getOperatorGridColumnWidth = (columnKey: string) =>
  OPERATOR_GRID_COLUMN_WIDTHS[columnKey] ?? 70;

const OPERATOR_LOG_COLUMN_WIDTHS: Record<string, number> = {
  userName: 94,
  machineNumber: 70,
  workItemTitle: 112,
  workSummary: 142,
  startedAt: 100,
  endedAt: 100,
  shift: 70,
  durationSeconds: 82,
  idleTime: 78,
  remark: 82,
  revenue: 86,
  status: 104,
};

const getOperatorLogColumnWidth = (columnKey: string) =>
  OPERATOR_LOG_COLUMN_WIDTHS[columnKey] ?? 84;

const SEARCH_FETCH_PAGE_SIZE = 100;

const formatOperatorLogStatus = (status?: string) => {
  const raw = String(status || "-").toUpperCase();
  if (raw === "IN_PROGRESS") return "In Progress";
  if (raw === "REJECTED") return "Rejected";
  if (raw === "COMPLETED") return "Completed";
  return raw
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

const getOperatorRowSearchValues = (row: TableRow, isAdmin: boolean) => {
  const counts = getGroupQaProgressCounts(row.entries);
  const stageSummary = [
    `Yet to Start ${counts.empty}`,
    `In Progress ${counts.ready}`,
    `Logged ${counts.saved}`,
    `QC ${counts.sent}`,
  ].join(" ");
  const estimatedTime = formatEstimatedTime(
    estimatedHoursFromAmount(
      row.entries.reduce((sum, entry) => sum + (Number(entry.totalHrs || 0) * Number(entry.rate || 0)), 0)
    )
  );

  const values: unknown[] = [estimatedTime, stageSummary];

  if (isAdmin) {
    values.push(row.groupTotalAmount ? `Rs. ${Math.round(row.groupTotalAmount)}` : "-");
  }

  row.entries.forEach((entry) => {
    values.push(
      entry.customer || "-",
      formatJobRefDisplay(entry.refNumber || ""),
      String((entry as any).programRefFile || (entry as any).programRefFileName || "-"),
      entry.description || "-",
      Math.round(Number(entry.cut || 0)),
      getThicknessDisplayValue(entry.thickness),
      entry.passLevel || "-",
      entry.setting || "-",
      Number(entry.qty || 0).toString(),
      toYN(entry.sedm),
      entry.assignedTo || "Unassign",
      formatMachineLabel(toMachineIndex(String(entry.machineNumber || "").trim()) || "-"),
      entry.createdBy || "-",
      ...(isAdmin ? [entry.totalAmount ? `Rs. ${Math.round(entry.totalAmount)}` : "-"] : [])
    );
  });

  return values;
};

const Operator = () => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserName = (getUserDisplayNameFromToken() || "").trim();
  const currentUserDisplayName = currentUserName;
  const isAdmin = userRole === "ADMIN";
  const canUseTaskSwitchTimer = userRole === "ADMIN" || userRole === "OPERATOR";
  const [sortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string | number>>(new Set());
  const [operatorGridJobs, setOperatorGridJobs] = useState<JobEntry[]>([]);
  const [isTaskTimerRunning, setIsTaskTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [operatorLogSearch, setOperatorLogSearch] = useState("");
  const [operatorLogStatus, setOperatorLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
  const [operatorLogMachine, setOperatorLogMachine] = useState("");
  const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });
  const [sendToQaTargets, setSendToQaTargets] = useState<SendToQaModalTarget[]>([]);
  const [isSendToQaModalOpen, setIsSendToQaModalOpen] = useState(false);
  const [isSendingToQa, setIsSendingToQa] = useState(false);

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
      setOperatorGridJobs((prev) =>
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

  const applyQaDispatchUpdates = useCallback((updates: Array<{ jobId: string; quantityNumbers: number[] }>) => {
    const updateJobList = (source: JobEntry[]) =>
      source.map((job) => {
        const targetUpdate = updates.find((item) => item.jobId === String(job.id));
        if (!targetUpdate) return job;
        const nextStates = { ...(job.quantityQaStates || {}) };
        targetUpdate.quantityNumbers.forEach((qty) => {
          nextStates[String(qty)] = "SENT_TO_QA";
        });
        return { ...job, quantityQaStates: nextStates };
      });

    setJobs((prev) => updateJobList(prev));
    setOperatorGridJobs((prev) => updateJobList(prev));
  }, [setJobs]);

  const handleConfirmSendToQa = useCallback(async (updates: Array<{ jobId: string; quantityNumbers: number[] }>) => {
    if (updates.length === 0) return;
    setIsSendingToQa(true);
    try {
      await Promise.all(
        updates.map((item) =>
          updateOperatorQaStatus(item.jobId, { quantityNumbers: item.quantityNumbers, status: "SENT_TO_QA" })
        )
      );
      applyQaDispatchUpdates(updates);
      setSelectedEntryIds(new Set());
      setSelectedJobIds(new Set());
      setIsSendToQaModalOpen(false);
      setSendToQaTargets([]);
      setToast({ message: "Selected quantities sent to QC.", variant: "success", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } catch (error) {
      setToast({ message: "Failed to send quantities to QC.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    } finally {
      setIsSendingToQa(false);
    }
  }, [applyQaDispatchUpdates, setJobs]);

  const handleViewJob = (row: TableRow) => {
    setViewingJob(row);
    setShowJobViewModal(true);
  };

  const handleDownloadCSV = () => {
    exportOperatorJobsToCSV(filteredTableData, isAdmin);
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
      setOperatorGridJobs((prev) =>
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
      setOperatorGridJobs((prev) =>
        prev.map((job) => (String(job.id) === String(jobId) ? { ...job, machineNumber } : job))
      );
    } catch (error) {
      setToast({ message: "Failed to update machine number.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    }
  };

  const handleSendSelectedRowsToQa = async () => {
    if (selectedEntryIds.size === 0) {
      setToast({ message: "Select at least one row to send to QC.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }

    const selectedKeySet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
    const selectedEntries = filteredTableData
      .flatMap((row) => row.entries)
      .filter((entry) => selectedKeySet.has(String(entry.id)));

    if (selectedEntries.length === 0) {
      setToast({ message: "No valid rows selected.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }
    openSendToQaModal(selectedEntries);
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
      setOperatorGridJobs((prev) => prev.filter((job) => !selectedIdSet.has(String(job.id))));
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

      const groupEntries = operatorGridJobs.filter((job) => String(job.groupId) === groupId);
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
    const targetEntries = filteredTableData
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
      setOperatorGridJobs((prev) =>
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
    name: getDisplayName(user.firstName, user.lastName, user.email, String(user._id)),
  }));

  const { tableData } = useOperatorTableData(
    operatorGridJobs,
    sortField,
    sortDirection,
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

  const jobSearchQuery = String(customerFilter || descriptionFilter || "").trim();

  const filteredTableData = useMemo(
    () =>
      tableData.filter((row) => matchesSearchQuery(getOperatorRowSearchValues(row, isAdmin), jobSearchQuery)),
    [tableData, isAdmin, jobSearchQuery]
  );

  const buildSendToQaTargets = useCallback((entries: JobEntry[]): SendToQaModalTarget[] => {
    const dedupedEntries = Array.from(new Map(entries.map((entry) => [String(entry.id), entry])).values());
    const targets: SendToQaModalTarget[] = [];

    dedupedEntries.forEach((entry, index) => {
      const totalQty = Math.max(1, Number(entry.qty || 1));
      const statuses = getQuantityProgressStatuses(entry, totalQty);
      const statusByQuantity = statuses.reduce<Record<number, any>>((acc, status, qtyIndex) => {
        acc[qtyIndex + 1] = status;
        return acc;
      }, {});
      const eligibleQuantityNumbers = getDispatchableQuantityNumbers(entry);
      if (eligibleQuantityNumbers.length === 0) return;

      const groupEntries = filteredTableData.find((row) => row.groupId === String(entry.groupId))?.entries || [];
      const sortedGroupEntryIds = groupEntries.map((job) => String(job.id));
      const rowType =
        sortedGroupEntryIds.length > 0 && sortedGroupEntryIds[0] === String(entry.id) ? "parent" : "child";
      const settingIndex = groupEntries.findIndex((job) => String(job.id) === String(entry.id));

      targets.push({
        jobId: String(entry.id),
        groupId: String(entry.groupId),
        customer: entry.customer || "",
        description: entry.description || "",
        refNumber: entry.refNumber || "",
        settingLabel: String(settingIndex >= 0 ? settingIndex + 1 : index + 1),
        totalQty,
        eligibleQuantityNumbers,
        statusByQuantity,
        defaultSelectedQuantityNumbers: eligibleQuantityNumbers,
        rowType,
      });
    });

    return targets;
  }, [filteredTableData]);

  const openSendToQaModal = useCallback((entries: JobEntry[]) => {
    const targets = buildSendToQaTargets(entries);
    if (targets.length === 0) {
      setToast({ message: "No logged quantities are ready to send to QC.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
      return;
    }
    setSendToQaTargets(targets);
    setIsSendToQaModalOpen(true);
  }, [buildSendToQaTargets]);

  const columns = useOperatorTable({
    canAssign,
    machineOptions: machineOptionsForDropdown,
    currentUserName: currentUserDisplayName,
    operatorUsers: operatorOptionUsers,
    handleAssignChange,
    handleMachineNumberChange,
    handleChildMachineNumberChange,
    handleViewJob,
    handleViewEntry: (entry) => {
      setViewingJob({
        groupId: String(entry.groupId),
        parent: entry,
        entries: [entry],
        groupTotalHrs: Number(entry.totalHrs || 0),
        groupTotalAmount: Number(entry.totalAmount || 0),
      });
      setShowJobViewModal(true);
    },
    handleSubmit,
    handleImageInput,
    handleOpenQaModal: openSendToQaModal,
    isAdmin,
    isImageInputDisabled: isTaskTimerRunning,
    toggleGroup,
  });

  const operatorGridRows = useMemo<OperatorDisplayRow[]>(
    () =>
      filteredTableData.flatMap((row) => {
        const hasChildren = row.entries.length > 1;
        const isExpanded = expandedGroups.has(row.groupId);
        const parentRow: OperatorDisplayRow = {
          kind: "parent",
          groupId: row.groupId,
          tableRow: row,
          entry: row.parent,
          childIndex: null,
          hasChildren,
          isExpanded,
        };
        if (!hasChildren || !isExpanded) {
          return [parentRow];
        }
        const childRows = row.entries.map((entry, index) => ({
          kind: "child" as const,
          groupId: row.groupId,
          tableRow: row,
          entry,
          childIndex: index,
          hasChildren: false,
          isExpanded: false,
        }));
        return [parentRow, ...childRows];
      }),
    [filteredTableData, expandedGroups]
  );
  const hasJobSearch = jobSearchQuery.length > 0;

  const operatorJobColumnDefs = useMemo(
    () => [
      {
        headerName: "",
        field: "__select__",
        width: 34,
        minWidth: 34,
        maxWidth: 34,
        sortable: false,
        resizable: false,
        suppressSizeToFit: true,
        suppressMovable: true,
        headerComponent: () => (
          <input
            type="checkbox"
            checked={filteredTableData.length > 0 && filteredTableData.every((row) => selectedJobIds.has(row.groupId))}
            onChange={(event) => {
              const checked = event.target.checked;
              const nextGroupIds = checked ? new Set(filteredTableData.map((row) => row.groupId)) : new Set<string>();
              const nextEntryIds = checked
                ? new Set(
                    filteredTableData.flatMap((row) =>
                      row.entries
                        .map((entry) => (entry.id === undefined || entry.id === null ? null : String(entry.id)))
                        .filter((id): id is string => Boolean(id))
                    )
                  )
                : new Set<string>();
              setSelectedJobIds(nextGroupIds);
              setSelectedEntryIds(nextEntryIds);
            }}
          />
        ),
        cellRenderer: (params: any) => {
          if (params.data?.kind === "child") {
            const entryId = params.data.entry?.id;
            if (entryId === undefined || entryId === null) return null;
            const key = String(entryId);
            return (
              <input
                type="checkbox"
                checked={selectedEntryIds.has(key)}
                onChange={(event) => {
                  handleChildRowSelect(String(params.data.groupId), key, event.target.checked);
                }}
                onClick={(event) => event.stopPropagation()}
              />
            );
          }

          if (params.data?.kind !== "parent") return null;
          const groupId = String(params.data.groupId);
          return (
            <input
              type="checkbox"
              checked={selectedJobIds.has(groupId)}
              onChange={(event) => {
                const selected = event.target.checked;
                const row = params.data.tableRow as TableRow;
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
                  if (selected) next.add(groupId);
                  else next.delete(groupId);
                  return next;
                });
              }}
              onClick={(event) => event.stopPropagation()}
            />
          );
        },
      },
      ...columns.map((column) => {
        const baseWidth = getOperatorGridColumnWidth(column.key);
        return {
          headerName: getOperatorHeaderName(column),
          field: column.key,
          width: baseWidth,
          minWidth: baseWidth,
          resizable: false,
          suppressMovable: true,
          cellClass: column.className,
          headerClass: column.headerClassName,
          cellRenderer:
            column.render
              ? (params: any) => column.render?.(params.data, params.node?.rowIndex || 0)
              : (params: any) => String(params.data?.entry?.[column.key] ?? "-"),
        };
      }),
    ],
    [columns, filteredTableData, handleChildRowSelect, selectedEntryIds, selectedJobIds]
  );

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

  const groupWorkedSecondsByGroupId = useMemo(() => new Map<string, number>(), []);

  const calculateWorkedSecondsByLogs = useCallback((logs: EmployeeLog[]) => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      const groupId = String(log.jobGroupId || "").trim();
      if (!groupId) return;
      if (String(log.role || "").toUpperCase() !== "OPERATOR") return;
      const workedSeconds = getWorkedSecondsForLog(log);
      map.set(groupId, (map.get(groupId) || 0) + workedSeconds);
    });
    return map;
  }, []);

  const getRevenueForLog = (log: EmployeeLog, workedSecondsMap: Map<string, number> = groupWorkedSecondsByGroupId): string => {
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
    const totalWorkedSeconds = workedSecondsMap.get(groupId) || 0;
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

  const machineFilterOptions = machineOptionsForDropdown;

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
      ...(isAdmin
        ? [
            {
              key: "revenue",
              label: "Revenue",
              sortable: false,
              render: (row: EmployeeLog) => <span className="log-revenue-value">{getRevenueForLog(row)}</span>,
            } as Column<EmployeeLog>,
          ]
        : []),
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
    [designationByUserName, groupWedmByGroupId, groupWorkedSecondsByGroupId, jobs, isAdmin]
  );

  const filterOperatorLogs = useMemo(
    () => (logs: EmployeeLog[]) =>
      logs.filter((log) =>
        matchesSearchQuery(
          [
            getLogUserDisplayName(log.userName, log.userEmail, "Operator"),
            designationByUserName.get(getLogUserDisplayName(log.userName, log.userEmail, "Operator").toLowerCase()) || "Operator",
            formatMachineLabel(getMachineNumberForLog(log)),
            log.workItemTitle || "",
            log.workSummary || "",
            formatDisplayDateTime(log.startedAt),
            formatDisplayDateTime(log.endedAt || null),
            getShiftLabel(log.startedAt),
            formatDuration(log.durationSeconds),
            String((log.metadata as any)?.idleTime || "-"),
            String((log.metadata as any)?.remark || "-"),
            ...(isAdmin ? [getRevenueForLog(log)] : []),
            formatOperatorLogStatus(log.status),
          ],
          operatorLogSearch
        )
      ),
    [designationByUserName, getRevenueForLog, isAdmin, operatorLogSearch]
  );
  const hasOperatorLogSearch = operatorLogSearch.trim().length > 0;

  const handleExportOperatorLogsCsv = () => {
    void (async () => {
      const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
        async (offset, limit) => {
          const page = await getEmployeeLogsPage({
            role: "OPERATOR",
            status: operatorLogStatus || undefined,
            machine: operatorLogMachine || undefined,
            offset,
            limit,
          });
          return { items: page.items, hasMore: page.hasMore };
        },
        SEARCH_FETCH_PAGE_SIZE
      );
      const filteredLogs = filterOperatorLogs(allLogs);
      const workedSecondsMap = calculateWorkedSecondsByLogs(filteredLogs);
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
        "Status",
      ];
      if (isAdmin) {
        headers.splice(headers.length - 1, 0, "Revenue");
      }

      const rows = filteredLogs.map((row) => {
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
          ...(isAdmin ? [getRevenueForLog(row, workedSecondsMap)] : []),
          formatOperatorLogStatus(row.status),
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
    })().catch(() => {
      setToast({ message: "Failed to export operator logs.", variant: "error", visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    });
  };

  const operatorLogColumnDefs = useMemo(
    () =>
      logsColumns.map((column) => ({
        headerName: typeof column.label === "string" ? column.label : String(column.key),
        field: column.key,
        width: getOperatorLogColumnWidth(String(column.key)),
        minWidth: getOperatorLogColumnWidth(String(column.key)),
        cellClass: column.className,
        headerClass: column.headerClassName,
        cellRenderer: column.render ? ((params: any) => column.render!(params.data, params.node?.rowIndex || 0)) : undefined,
      })),
    [logsColumns]
  );

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
              {loadingJobs && operatorGridJobs.length === 0 ? (
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
                    currentUserName={currentUserDisplayName}
                    onApplyBulkAssignment={handleApplyBulkAssignment}
                  />
                  <LazyAgGrid
                    columnDefs={operatorJobColumnDefs as any}
                    fetchPage={async (offset, limit) => {
                      if (hasJobSearch) {
                        const items = await fetchAllPaginatedItems<JobEntry>(
                          async (pageOffset, pageLimit) => {
                            const page = await getOperatorJobsPage(
                              filters,
                              "",
                              createdByFilter,
                              assignedToFilter,
                              "",
                              { offset: pageOffset, limit: pageLimit }
                            );
                            return { items: page.items, hasMore: page.hasMore };
                          },
                          SEARCH_FETCH_PAGE_SIZE
                        );
                        return { items, hasMore: false };
                      }

                      const page = await getOperatorJobsPage(
                        filters,
                        customerFilter,
                        createdByFilter,
                        assignedToFilter,
                        descriptionFilter,
                        { offset, limit }
                      );
                      return { items: page.items, hasMore: page.hasMore };
                    }}
                    rows={operatorGridJobs}
                    onRowsChange={setOperatorGridJobs}
                    transformRows={() => operatorGridRows}
                    getRowId={(row: OperatorDisplayRow) =>
                      row.kind === "parent" ? `parent__${row.groupId}` : `child__${row.groupId}__${row.entry.id}`
                    }
                    emptyMessage="No entries added yet."
                    getRowClass={(params) => {
                      if (params.data?.kind === "child") {
                        const childFlagClass = getRowClassName([params.data.entry], false, true);
                        const childCounts = getQaProgressCounts(
                          params.data.entry,
                          Math.max(1, Number(params.data.entry.qty || 1))
                        );
                        const childLogged = childCounts.saved + childCounts.ready;
                        const childMax = Math.max(childLogged, childCounts.sent, childCounts.empty);
                        let childStageClass = "operator-stage-row-not-started";
                        if (childCounts.sent === childMax) childStageClass = "operator-stage-row-dispatched";
                        else if (childLogged === childMax) childStageClass = "operator-stage-row-logged";
                        return `${childFlagClass} ${childStageClass}`;
                      }

                      const row = params.data.tableRow as TableRow;
                      const flagClass = getParentRowClassName(row.parent, row.entries, expandedGroups.has(row.groupId));
                      const c = getGroupQaProgressCounts(row.entries);
                      const logged = c.saved + c.ready;
                      const maxCount = Math.max(logged, c.sent, c.empty);
                      let stageClass = "operator-stage-row-not-started";
                      if (c.sent === maxCount) stageClass = "operator-stage-row-dispatched";
                      else if (logged === maxCount) stageClass = "operator-stage-row-logged";
                      return `${flagClass} ${stageClass}`;
                    }}
                    className="jobs-table-wrapper operator-table-no-scroll"
                    rowHeight={56}
                    fitColumns={true}
                    refreshKey={`${hasJobSearch}|${createdByFilter}|${assignedToFilter}|${JSON.stringify(filters)}`}
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
                  placeholder="Search any column..."
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
              <LazyAgGrid
                columnDefs={operatorLogColumnDefs as any}
                transformRows={filterOperatorLogs}
                fetchPage={async (offset, limit) => {
                  if (hasOperatorLogSearch) {
                    const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
                      async (pageOffset, pageLimit) => {
                        const page = await getEmployeeLogsPage({
                          role: "OPERATOR",
                          status: operatorLogStatus || undefined,
                          machine: operatorLogMachine || undefined,
                          offset: pageOffset,
                          limit: pageLimit,
                        });
                        return { items: page.items, hasMore: page.hasMore };
                      },
                      SEARCH_FETCH_PAGE_SIZE
                    );
                    return { items: allLogs, hasMore: false };
                  }

                  const page = await getEmployeeLogsPage({
                    role: "OPERATOR",
                    status: operatorLogStatus || undefined,
                    machine: operatorLogMachine || undefined,
                    offset,
                    limit,
                  });
                  return { items: page.items, hasMore: page.hasMore };
                }}
                emptyMessage="No operator logs found."
                getRowId={(row) => row._id}
                className="operator-logs-table logs-center"
                refreshKey={`${hasOperatorLogSearch}|${operatorLogStatus}|${operatorLogMachine}`}
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
        <SendToQaModal
          isOpen={isSendToQaModalOpen}
          targets={sendToQaTargets}
          isSubmitting={isSendingToQa}
          onClose={() => {
            if (isSendingToQa) return;
            setIsSendToQaModalOpen(false);
            setSendToQaTargets([]);
          }}
          onConfirm={handleConfirmSendToQa}
        />
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
