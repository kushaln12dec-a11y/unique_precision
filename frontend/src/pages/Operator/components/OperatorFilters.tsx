import React, { useEffect, useState } from "react";
import FilterModal from "../../../components/FilterModal";
import FilterButton from "../../../components/FilterButton";
import FilterBadges from "../../../components/FilterBadges";
import DownloadIcon from "@mui/icons-material/Download";
import type { FilterField, FilterCategory, FilterValues } from "../../../components/FilterModal";

type OperatorFiltersProps = {
  filters: FilterValues;
  filterFields: FilterField[];
  filterCategories: FilterCategory[];
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
  assignedToFilter: string;
  productionStageFilter: string;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  operatorUsers: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  onShowFilterModal: (show: boolean) => void;
  onApplyFilters: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: string, type: "inline" | "modal") => void;
  onCustomerFilterChange: (value: string) => void;
  onDescriptionFilterChange: (value: string) => void;
  onCreatedByFilterChange: (value: string) => void;
  onAssignedToFilterChange: (value: string) => void;
  onProductionStageFilterChange: (value: string) => void;
  canUseTaskSwitchTimer: boolean;
  onSaveTaskSwitch: (payload: {
    idleTime: string;
    remark: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }) => Promise<void>;
  onShowToast: (message: string, variant?: "success" | "error" | "info") => void;
  onTimerRunningChange: (running: boolean) => void;
  onDownloadCSV: () => void;
  onSendSelectedRowsToQa: () => void;
  selectedRowsCount: number;
};

export const OperatorFilters: React.FC<OperatorFiltersProps> = ({
  filters,
  filterFields,
  filterCategories,
  customerFilter,
  descriptionFilter,
  createdByFilter,
  assignedToFilter,
  productionStageFilter,
  showFilterModal,
  activeFilterCount,
  users,
  operatorUsers,
  onShowFilterModal,
  onApplyFilters,
  onClearFilters,
  onRemoveFilter,
  onCustomerFilterChange,
  onDescriptionFilterChange,
  onCreatedByFilterChange,
  onAssignedToFilterChange,
  onProductionStageFilterChange,
  canUseTaskSwitchTimer,
  onSaveTaskSwitch,
  onShowToast,
  onTimerRunningChange,
  onDownloadCSV,
  onSendSelectedRowsToQa,
  selectedRowsCount,
}) => {
  const TIMER_STORAGE_KEY = "operator_idle_timer_state_v1";
  const [idleTransitionRunning, setIdleTransitionRunning] = useState(false);
  const [idleTransitionStartedAt, setIdleTransitionStartedAt] = useState<number | null>(null);
  const [idleTransitionElapsedSeconds, setIdleTransitionElapsedSeconds] = useState(0);
  const [idleTransitionSaving, setIdleTransitionSaving] = useState(false);
  const [showIdleTransitionDetails, setShowIdleTransitionDetails] = useState(false);
  const [idleTransitionReason, setIdleTransitionReason] = useState("");
  const [idleTransitionRemark, setIdleTransitionRemark] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        running?: boolean;
        startedAt?: number | null;
        reason?: string;
        remark?: string;
        showDetails?: boolean;
      };
      if (parsed.running && parsed.startedAt) {
        setIdleTransitionRunning(true);
        setIdleTransitionStartedAt(parsed.startedAt);
        setIdleTransitionElapsedSeconds(Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000)));
      }
      setIdleTransitionReason(String(parsed.reason || ""));
      setIdleTransitionRemark(String(parsed.remark || ""));
      setShowIdleTransitionDetails(Boolean(parsed.showDetails || parsed.running));
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          running: idleTransitionRunning,
          startedAt: idleTransitionStartedAt,
          reason: idleTransitionReason,
          remark: idleTransitionRemark,
          showDetails: showIdleTransitionDetails,
        })
      );
    } catch {
    }
  }, [
    idleTransitionRunning,
    idleTransitionStartedAt,
    idleTransitionReason,
    idleTransitionRemark,
    showIdleTransitionDetails,
  ]);

  useEffect(() => {
    onTimerRunningChange(idleTransitionRunning);
  }, [idleTransitionRunning, onTimerRunningChange]);

  useEffect(() => {
    if (!idleTransitionRunning || !idleTransitionStartedAt) return;
    const interval = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - idleTransitionStartedAt) / 1000));
      setIdleTransitionElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [idleTransitionRunning, idleTransitionStartedAt]);

  const formatTimer = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleToggleIdleTransitionTimer = () => {
    if (idleTransitionRunning) {
      onShowToast("Save Idle Time and Remark before stopping timer.", "error");
      return;
    }

    setIdleTransitionReason("");
    setIdleTransitionRemark("");
    setShowIdleTransitionDetails(true);
    setIdleTransitionElapsedSeconds(0);
    setIdleTransitionStartedAt(Date.now());
    setIdleTransitionRunning(true);
  };

  const handleSaveIdleTransition = async () => {
    if (!idleTransitionStartedAt) {
      onShowToast("Start timer first.", "error");
      return;
    }

    if (!idleTransitionReason.trim()) {
      onShowToast("Idle Time is required.", "error");
      return;
    }
    if (!idleTransitionRemark.trim()) {
      onShowToast("Remark is required.", "error");
      return;
    }

    const endedAtMs = Date.now();
    const durationSeconds = Math.max(0, Math.floor((endedAtMs - idleTransitionStartedAt) / 1000));

    try {
      setIdleTransitionSaving(true);
      await onSaveTaskSwitch({
        idleTime: idleTransitionReason.trim(),
        remark: idleTransitionRemark.trim(),
        startedAt: new Date(idleTransitionStartedAt).toISOString(),
        endedAt: new Date(endedAtMs).toISOString(),
        durationSeconds,
      });

      setIdleTransitionRunning(false);
      setIdleTransitionStartedAt(null);
      setIdleTransitionElapsedSeconds(0);
      setShowIdleTransitionDetails(false);
      setIdleTransitionReason("");
      setIdleTransitionRemark("");
      onShowToast("Task switch details saved to employee logs.", "success");
      try {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {
      }
    } catch (error: any) {
      onShowToast(error?.message || "Failed to save task switch log.", "error");
    } finally {
      setIdleTransitionSaving(false);
    }
  };

  return (
    <>
      <div className="panel-header">
        <div className="inline-filters">
          <div className="operator-filters-top-row">
            <div className="filter-group operator-filter-customer">
              <label htmlFor="customer-search">Customer</label>
              <input
                id="customer-search"
                type="text"
                placeholder="Search customer..."
                value={customerFilter}
                onChange={(e) => onCustomerFilterChange(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group operator-filter-description">
              <label htmlFor="description-search">Description</label>
              <input
                id="description-search"
                type="text"
                placeholder="Search by description..."
                value={descriptionFilter}
                onChange={(e) => onDescriptionFilterChange(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group operator-filter-created-by">
              <label htmlFor="created-by-select">Created By</label>
              <select
                id="created-by-select"
                value={createdByFilter}
                onChange={(e) => onCreatedByFilterChange(e.target.value)}
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
            <div className="filter-group operator-filter-assigned-to">
              <label htmlFor="assigned-to-select">Assigned To</label>
              <select
                id="assigned-to-select"
                value={assignedToFilter}
                onChange={(e) => onAssignedToFilterChange(e.target.value)}
                className="filter-select assigned-to-filter-select"
              >
                <option value="">All</option>
                <option value="Unassigned">Unassigned</option>
                {operatorUsers.length > 0
                  ? operatorUsers.map((user) => {
                    const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                    return (
                      <option key={user._id} value={displayName}>
                        {displayName}
                      </option>
                    );
                  })
                  : users.map((user) => {
                    const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                    return (
                      <option key={user._id} value={displayName}>
                        {displayName}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="operator-status-legend-group">
              <div className="filter-group operator-filter-status">
                <label htmlFor="production-stage-select">Status</label>
                <select
                  id="production-stage-select"
                  value={productionStageFilter}
                  onChange={(e) => onProductionStageFilterChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All</option>
                  <option value="OP_LOGGED">Operation Logged</option>
                  <option value="QA_DISPATCHED">QA Dispatched</option>
                  <option value="PENDING_INPUT">Not Started</option>
                </select>
              </div>
              {canUseTaskSwitchTimer && (
                <div className="operator-timer-inline-top">
                  <div className="filter-group operator-idle-transition-group">
                    <label htmlFor="operator-idle-transition-btn" className="operator-idle-transition-label-hidden">
                      Task Switch Timer
                    </label>
                    <button
                      id="operator-idle-transition-btn"
                      type="button"
                      className={`operator-idle-transition-btn ${idleTransitionRunning ? "running" : ""}`}
                      onClick={handleToggleIdleTransitionTimer}
                      disabled={idleTransitionSaving}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="operator-idle-transition-svg"
                        aria-hidden="true"
                      >
                        <path d="M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9zm4 10h-5V7h2v4h3z" />
                      </svg>
                    </button>
                    <div className="operator-idle-transition-time">{formatTimer(idleTransitionElapsedSeconds)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {canUseTaskSwitchTimer && (
            <div className="operator-idle-transition-row">
              <div className="operator-stage-legend-inline">
                <span className="operator-stage-legend-title">Stage Legend:</span>
                <span className="operator-stage-chip saved">Operation Logged</span>
                <span className="operator-stage-chip sent">QA Dispatched</span>
                <span className="operator-stage-chip empty">Not Started</span>
              </div>
              <div className="operator-idle-transition-inline">
                {showIdleTransitionDetails && (
                  <div className="operator-idle-transition-details">
                    <div className="filter-group operator-idle-transition-reason-group">
                      <label htmlFor="operator-idle-transition-reason">Idle Time</label>
                      <select
                        id="operator-idle-transition-reason"
                        value={idleTransitionReason}
                        onChange={(e) => setIdleTransitionReason(e.target.value)}
                        className="filter-select"
                      >
                        <option value="">Select</option>
                        <option value="Power Break">Power Break</option>
                        <option value="Machine Breakdown">Machine Breakdown</option>
                        <option value="Vertical Dial">Vertical Dial</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Consumables Change">Consumables Change</option>
                      </select>
                    </div>
                    <div className="filter-group operator-idle-transition-remark-group">
                      <label htmlFor="operator-idle-transition-remark">Remark</label>
                      <input
                        id="operator-idle-transition-remark"
                        type="text"
                        placeholder="Enter remark..."
                        value={idleTransitionRemark}
                        onChange={(e) => setIdleTransitionRemark(e.target.value)}
                        className="filter-input operator-idle-transition-remark-input"
                      />
                    </div>
                    <div className="filter-group operator-idle-transition-save-group">
                      <label htmlFor="operator-idle-transition-save" className="operator-idle-transition-label-hidden">
                        Save
                      </label>
                      <button
                        id="operator-idle-transition-save"
                        type="button"
                        className="operator-idle-transition-save-btn"
                        onClick={handleSaveIdleTransition}
                        disabled={idleTransitionSaving}
                      >
                        {idleTransitionSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="panel-header-actions">
          <button className="btn-download-csv" onClick={onDownloadCSV} title="Download CSV">
            <DownloadIcon sx={{ fontSize: "1rem" }} />
            CSV
          </button>
          <button
            className="btn-download-csv"
            onClick={onSendSelectedRowsToQa}
            disabled={selectedRowsCount === 0}
            title="Move selected rows to QA"
          >
            Send To QA{selectedRowsCount > 0 ? ` (${selectedRowsCount})` : ""}
          </button>
          <FilterButton onClick={() => onShowFilterModal(true)} activeFilterCount={activeFilterCount} />
        </div>
      </div>
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => onShowFilterModal(false)}
        fields={filterFields}
        categories={filterCategories}
        initialValues={filters}
        onApply={onApplyFilters}
        onClear={onClearFilters}
      />
      <FilterBadges
        filters={filters}
        filterFields={filterFields}
        customerFilter={customerFilter}
        descriptionFilter={descriptionFilter}
        createdByFilter={createdByFilter}
        assignedToFilter={assignedToFilter}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
};
