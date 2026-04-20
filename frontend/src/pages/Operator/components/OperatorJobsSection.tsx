import React from "react";
import LazyAgGrid from "../../../components/LazyAgGrid";
import AppLoader from "../../../components/AppLoader";
import { OperatorFilters } from "./OperatorFilters";
import { formatEstimatedTime } from "../../../utils/jobFormatting";
import { getDominantQaStageClass, getGroupQaProgressCounts, getQaProgressCounts } from "../utils/qaProgress";
import { getParentRowClassName, getRowClassName } from "../../Programmer/utils/priorityUtils";
import type { FilterValues } from "../../../components/FilterModal";
import type { JobEntry } from "../../../types/job";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";
import type { OperatorCompletionAlert, OperatorTableRow } from "../types";
import type { EmployeeLog } from "../../../types/employeeLog";

const COMPLETION_ALERT_TOAST_COOLDOWN_MS = 60_000;

type Props = {
  loadingJobs: boolean;
  operatorGridJobs: JobEntry[];
  filters: FilterValues;
  filterFields: any[];
  filterCategories: any[];
  customerFilter: string;
  createdByFilter: string;
  assignedToFilter: string;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  operatorUsers: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  setShowFilterModal: (show: boolean) => void;
  handleApplyFilters: (filters: FilterValues) => void;
  handleClearFilters: () => void;
  handleRemoveFilter: (key: string, type: "inline" | "modal") => void;
  setCustomerFilter: (value: string) => void;
  setDescriptionFilter: (value: string) => void;
  setCreatedByFilter: (value: string) => void;
  setAssignedToFilter: (value: string) => void;
  canUseTaskSwitchTimer: boolean;
  canOperateInputs: boolean;
  canEditAssignments: boolean;
  handleSaveTaskSwitch: (payload: { idleTime: string; remark: string; startedAt: string; endedAt: string; durationSeconds: number }) => Promise<void>;
  setIsTaskTimerRunning: (running: boolean) => void;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
  handleDownloadCSV: () => void;
  handleSendSelectedRowsToQa: () => void;
  selectedEntryIds: Set<string | number>;
  machineOptionsForDropdown: string[];
  handleApplyBulkAssignment: (payload: { operators: string[]; machineNumber: string }) => void;
  operatorJobColumnDefs: any[];
  fetchPage: (offset: number, limit: number) => Promise<{ items: JobEntry[]; hasMore: boolean }>;
  setOperatorGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  operatorGridRows: OperatorDisplayRow[];
  expandedGroups: Set<string>;
  createdByRefreshKey: string;
  activeOperatorRuns: EmployeeLog[];
  onOpenRunningJob: (groupId: string, cutId?: string) => void;
  completionAlerts: OperatorCompletionAlert[];
};

export const OperatorJobsSection: React.FC<Props> = ({
  loadingJobs,
  operatorGridJobs,
  filters,
  filterFields,
  filterCategories,
  customerFilter,
  createdByFilter,
  assignedToFilter,
  showFilterModal,
  activeFilterCount,
  users,
  operatorUsers,
  setShowFilterModal,
  handleApplyFilters,
  handleClearFilters,
  handleRemoveFilter,
  setCustomerFilter,
  setDescriptionFilter,
  setCreatedByFilter,
  setAssignedToFilter,
  canUseTaskSwitchTimer,
  canOperateInputs,
  canEditAssignments,
  handleSaveTaskSwitch,
  setIsTaskTimerRunning,
  setToast,
  handleDownloadCSV,
  handleSendSelectedRowsToQa,
  selectedEntryIds,
  machineOptionsForDropdown,
  handleApplyBulkAssignment,
  operatorJobColumnDefs,
  fetchPage,
  setOperatorGridJobs,
  operatorGridRows,
  expandedGroups,
  createdByRefreshKey,
  activeOperatorRuns,
  onOpenRunningJob,
  completionAlerts,
}) => {
  const alertToastHistoryRef = React.useRef<Map<string, number>>(new Map());

  const runningMachineAlerts = React.useMemo(() => {
    const alertsByMachine = new Map<
      string,
      {
        groupId: string;
        cutId?: string;
        machineNumber: string;
        jobRef: string;
        customer: string;
        description: string;
        quantityLabel: string;
        operatorName?: string;
        estimatedTime: string;
        severity: "safe" | "warning" | "danger";
        statusLabel: string;
      }
    >();
    const completionAlertByCutId = new Map(
      completionAlerts.map((alert) => [String(alert.cutId || ""), alert])
    );
    activeOperatorRuns.forEach((log) => {
      const entry = operatorGridJobs.find((job) => String(job.id) === String(log.jobId));
      if (!entry) return;
      const metadata = (log.metadata || {}) as Record<string, any>;
      const quantityFrom = Math.max(1, Number(log.quantityFrom || 1));
      const quantityTo = Math.max(quantityFrom, Number(log.quantityTo || quantityFrom));
      const quantityCount = Math.max(1, quantityTo - quantityFrom + 1);
      const perQuantityHours = Number(entry.totalHrs || 0) / Math.max(1, Number(entry.qty || 1));
      const completionAlert = completionAlertByCutId.get(String(entry.id));
      alertsByMachine.set(String(entry.id), {
        groupId: String(entry.groupId),
        cutId: String(entry.id),
        machineNumber: String(metadata.machineNumber || entry.machineNumber || "Machine Pending"),
        jobRef: String(entry.refNumber || ""),
        customer: String(entry.customer || ""),
        description: entry.description || "",
        quantityLabel: quantityFrom === quantityTo ? `QTY ${quantityFrom}` : `QTY ${quantityFrom}-${quantityTo}`,
        operatorName: String(log.userName || entry.assignedTo || "").trim(),
        estimatedTime: formatEstimatedTime(perQuantityHours * quantityCount),
        severity:
          completionAlert?.severity === "danger"
            ? "danger"
            : completionAlert?.severity === "warning"
              ? "warning"
              : "safe",
        statusLabel:
          completionAlert?.severity === "danger"
            ? "Overdue"
            : completionAlert?.severity === "warning"
              ? "Due Soon"
              : "Running",
      });
    });
    return Array.from(alertsByMachine.values());
  }, [activeOperatorRuns, completionAlerts, operatorGridJobs]);

  const activeRunsByJobId = React.useMemo(
    () => new Map(activeOperatorRuns.map((log) => [String(log.jobId || ""), log])),
    [activeOperatorRuns]
  );

  React.useEffect(() => {
    if (completionAlerts.length === 0) {
      alertToastHistoryRef.current.clear();
      return;
    }

    const now = Date.now();
    const activeAlertIds = new Set(completionAlerts.map((alert) => alert.alertId));

    Array.from(alertToastHistoryRef.current.keys()).forEach((alertId) => {
      if (!activeAlertIds.has(alertId)) {
        alertToastHistoryRef.current.delete(alertId);
      }
    });

    const nextToastAlert = completionAlerts.find((alert) => {
      const lastShownAt = alertToastHistoryRef.current.get(alert.alertId) || 0;
      return now - lastShownAt >= COMPLETION_ALERT_TOAST_COOLDOWN_MS;
    });

    if (!nextToastAlert) return;

    alertToastHistoryRef.current.set(nextToastAlert.alertId, now);
    const variant = nextToastAlert.severity === "danger" ? "error" : "info";
    setToast({
      message: `${nextToastAlert.jobRef || "Job"} on ${nextToastAlert.machineNumber} is ${nextToastAlert.statusLabel.toLowerCase()}.`,
      variant,
      visible: true,
    });
    const timeoutId = window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3500);

    return () => window.clearTimeout(timeoutId);
  }, [completionAlerts, setToast]);

  if (loadingJobs && operatorGridJobs.length === 0) {
    return <AppLoader message="Loading operator jobs..." />;
  }

  return (
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
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onRemoveFilter={handleRemoveFilter}
        onJobSearchFilterChange={(value) => {
          setCustomerFilter(value);
          setDescriptionFilter(value);
        }}
        onCreatedByFilterChange={setCreatedByFilter}
        onAssignedToFilterChange={setAssignedToFilter}
        canUseTaskSwitchTimer={canUseTaskSwitchTimer && canOperateInputs}
        canOperateInputs={canOperateInputs}
        canEditAssignments={canEditAssignments}
        onSaveTaskSwitch={handleSaveTaskSwitch}
        onTimerRunningChange={setIsTaskTimerRunning}
        onShowToast={(message, variant = "info") => {
          setToast({ message, variant, visible: true });
          setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
        }}
        onDownloadCSV={handleDownloadCSV}
        onSendSelectedRowsToQa={canOperateInputs ? handleSendSelectedRowsToQa : () => undefined}
        selectedRowsCount={selectedEntryIds.size}
        machineOptions={machineOptionsForDropdown}
        onApplyBulkAssignment={canEditAssignments ? handleApplyBulkAssignment : () => undefined}
        runningMachineAlerts={runningMachineAlerts}
        onOpenRunningJob={onOpenRunningJob}
        onClearAllFilters={handleClearFilters}
      />
      <LazyAgGrid
        columnDefs={operatorJobColumnDefs as any}
        fetchPage={fetchPage}
        rows={operatorGridJobs}
        onRowsChange={setOperatorGridJobs}
        transformRows={() => operatorGridRows}
        getRowId={(row: OperatorDisplayRow) =>
          row.kind === "parent" ? `parent__${row.groupId}` : `child__${row.groupId}__${row.entry.id}`
        }
        emptyMessage="No data available."
        getRowClass={(params) => {
          if (params.data?.kind === "child") {
            const childFlagClass = getRowClassName([params.data.entry], false, true);
            const childCounts = getQaProgressCounts(
              params.data.entry,
              Math.max(1, Number(params.data.entry.qty || 1)),
              activeRunsByJobId.get(String(params.data.entry.id))
            );
            const childStageClass = getDominantQaStageClass(childCounts);
            return `${childFlagClass} ${childStageClass}`;
          }

          const row = params.data.tableRow as OperatorTableRow;
          const flagClass = getParentRowClassName(row.parent, row.entries, expandedGroups.has(row.groupId));
          const c = getGroupQaProgressCounts(row.entries, activeRunsByJobId);
          const stageClass = getDominantQaStageClass(c);
          return `${flagClass} ${stageClass}`;
        }}
        className="jobs-table-wrapper operator-table-no-scroll"
        rowHeight={42}
        fitColumns={true}
        refreshKey={createdByRefreshKey}
      />
    </>
  );
};

export default OperatorJobsSection;
