import React, { useMemo } from "react";
import FilterModal from "../../../components/FilterModal";
import FilterButton from "../../../components/FilterButton";
import FilterBadges from "../../../components/FilterBadges";
import Modal from "../../../components/Modal";
import DownloadIcon from "@mui/icons-material/Download";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import { OperatorTaskTimer } from "./OperatorTaskTimer";
import SelectDropdown, { type SelectOption } from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "./MultiSelectOperators";
import type { FilterField, FilterCategory, FilterValues } from "../../../components/FilterModal";
import { getDisplayName } from "../../../utils/jobFormatting";

type OperatorFiltersProps = {
  filters: FilterValues;
  filterFields: FilterField[];
  filterCategories: FilterCategory[];
  jobSearchFilter: string;
  createdByFilter: string;
  assignedToFilter: string;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  operatorUsers: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  onShowFilterModal: (show: boolean) => void;
  onApplyFilters: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: string, type: "inline" | "modal") => void;
  onJobSearchFilterChange: (value: string) => void;
  onCreatedByFilterChange: (value: string) => void;
  onAssignedToFilterChange: (value: string) => void;
  canUseTaskSwitchTimer: boolean;
  onSaveTaskSwitch: (payload: {
    idleTime: string;
    remark: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }) => Promise<void>;
  onShowToast: (message: string, variant?: "success" | "error" | "info") => void;
  onTimerRunningChange?: (running: boolean) => void;
  onDownloadCSV: () => void;
  onSendSelectedRowsToQa: () => void;
  selectedRowsCount: number;
  machineOptions: string[];
  onApplyBulkAssignment: (payload: { operators: string[]; machineNumber: string }) => void;
  runningMachineAlerts: Array<{
    machineNumber: string;
    jobRef: string;
    customer: string;
    description: string;
    quantityLabel: string;
    operatorName?: string;
    estimatedTime: string;
  }>;
  onClearAllFilters: () => void;
};

export const OperatorFilters: React.FC<OperatorFiltersProps> = ({
  filters,
  filterFields,
  filterCategories,
  jobSearchFilter,
  createdByFilter,
  assignedToFilter,
  showFilterModal,
  activeFilterCount,
  users,
  operatorUsers,
  onShowFilterModal,
  onApplyFilters,
  onClearFilters,
  onRemoveFilter,
  onJobSearchFilterChange,
  onCreatedByFilterChange,
  onAssignedToFilterChange,
  canUseTaskSwitchTimer,
  onSaveTaskSwitch,
  onShowToast,
  onTimerRunningChange,
  onDownloadCSV,
  onSendSelectedRowsToQa,
  selectedRowsCount,
  machineOptions,
  onApplyBulkAssignment,
  runningMachineAlerts,
  onClearAllFilters,
}) => {
  const [bulkOperator, setBulkOperator] = React.useState("");
  const [bulkMachineNumber, setBulkMachineNumber] = React.useState("");
  const [showRunningJobsModal, setShowRunningJobsModal] = React.useState(false);

  const selectedCreatedByUsers = useMemo(
    () =>
      String(createdByFilter || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [createdByFilter]
  );
  const selectedAssignedOperators = useMemo(
    () =>
      String(assignedToFilter || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [assignedToFilter]
  );
  const createdByMultiSelectUsers = useMemo(
    () =>
      users.map((user) => ({
        id: user._id,
        name: getDisplayName(user.firstName, user.lastName, user.email),
      })),
    [users]
  );
  const assignedToMultiSelectUsers = useMemo(() => {
    const source = operatorUsers.length > 0 ? operatorUsers : users;
    const items = source.map((user) => ({
      id: user._id,
      name: getDisplayName(user.firstName, user.lastName, user.email),
    }));
    return [{ id: "__unassign__", name: "UNASSIGN" }, ...items];
  }, [operatorUsers, users]);

  const bulkMachineOptions = useMemo<SelectOption[]>(
    () => [
      { label: "Any Machine", value: "" },
      ...machineOptions.map((machine) => ({ label: machine, value: machine })),
    ],
    [machineOptions]
  );

  const bulkOperatorOptions = useMemo<SelectOption[]>(() => {
    const source = operatorUsers.length > 0 ? operatorUsers : users;
    const seen = new Set<string>();
    const options: SelectOption[] = [
      { label: "Keep Operator", value: "" },
      { label: "Unassign", value: "Unassign" },
    ];
    source.forEach((user) => {
      const displayName = getDisplayName(user.firstName, user.lastName, user.email, String(user._id));
      const key = displayName.toLowerCase();
      if (!displayName || seen.has(key)) return;
      seen.add(key);
      options.push({ label: displayName, value: displayName });
    });
    return options;
  }, [operatorUsers, users]);

  const hasInlineFilters = Boolean(jobSearchFilter || createdByFilter || assignedToFilter);
  const showClearAll = activeFilterCount > 0 || hasInlineFilters;

  return (
    <>
      <div className="panel-header">
        <div className="inline-filters">
          <div className="operator-filters-top-row">
            <div className="filter-group operator-filter-customer">
              <label htmlFor="operator-search">Search</label>
              <input
                id="operator-search"
                type="text"
                placeholder="Search any column..."
                value={jobSearchFilter}
                onChange={(e) => onJobSearchFilterChange(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group operator-filter-created-by">
              <label>Created By</label>
              <MultiSelectOperators
                selectedOperators={selectedCreatedByUsers}
                availableOperators={createdByMultiSelectUsers}
                onChange={(nextValues) => onCreatedByFilterChange(nextValues.join(", "))}
                placeholder="ALL USERS"
                className="operator-filter-dropdown operator-filter-multi"
                compact={true}
              />
            </div>
            <div className="filter-group operator-filter-assigned-to">
              <label>Assigned To</label>
              <MultiSelectOperators
                selectedOperators={selectedAssignedOperators}
                availableOperators={assignedToMultiSelectUsers}
                onChange={(nextValues) => onAssignedToFilterChange(nextValues.join(", "))}
                placeholder="ALL"
                className="operator-filter-dropdown operator-filter-multi"
                compact={true}
              />
            </div>
          </div>
          <div className="operator-stage-legend-inline">
            <span className="operator-stage-legend-title">Stage Legend:</span>
            <span className="operator-stage-chip empty">NOT STARTED</span>
            <span className="operator-stage-chip running">RUNNING</span>
            <span className="operator-stage-chip ready">HOLD</span>
            <span className="operator-stage-chip saved">LOGGED</span>
            <span className="operator-stage-chip sent">QC</span>
          </div>
        </div>

        <div className="panel-header-actions">
          {canUseTaskSwitchTimer && (
            <div className="operator-timer-right-slot">
              <OperatorTaskTimer
                onSaveTaskSwitch={onSaveTaskSwitch}
                onShowToast={onShowToast}
                onRunningChange={onTimerRunningChange}
              />
            </div>
          )}
          <div className="operator-actions-row">
            {selectedRowsCount > 0 && (
              <div className="operator-bulk-assign-group operator-bulk-assign-banner">
                <span className="operator-bulk-selected-pill">{selectedRowsCount} selected</span>
                <SelectDropdown
                  value={bulkOperator}
                  onChange={setBulkOperator}
                  options={bulkOperatorOptions}
                  placeholder="Keep Operator"
                  align="left"
                  className="operator-bulk-operators"
                />
                <SelectDropdown
                  value={bulkMachineNumber}
                  onChange={setBulkMachineNumber}
                  options={bulkMachineOptions}
                  placeholder="Any Machine"
                  align="left"
                  className="operator-bulk-machine"
                />
                <button
                  className="operator-bulk-apply-btn"
                  onClick={() => onApplyBulkAssignment({ operators: bulkOperator ? [bulkOperator] : [], machineNumber: bulkMachineNumber })}
                  disabled={!bulkOperator && !bulkMachineNumber}
                  title="Apply selected operators/machine to selected rows"
                >
                  Apply Selected
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn-download-csv operator-running-info-btn"
              onClick={() => setShowRunningJobsModal(true)}
              disabled={runningMachineAlerts.length === 0}
              title={runningMachineAlerts.length > 0 ? "Show running machine info" : "No running machines"}
            >
              <span className="operator-running-info-icon-wrap" aria-hidden="true">
                <PrecisionManufacturingRoundedIcon sx={{ fontSize: "1rem" }} />
                {runningMachineAlerts.length > 0 ? (
                  <RadioButtonCheckedRoundedIcon className="operator-running-info-icon-pulse" sx={{ fontSize: "0.46rem" }} />
                ) : null}
              </span>
            </button>
            <button className="btn-download-csv" onClick={onDownloadCSV} title="Download CSV">
              <DownloadIcon sx={{ fontSize: "1rem" }} />
              CSV
            </button>
            <button
              className="btn-download-csv operator-send-qa-btn"
              onClick={onSendSelectedRowsToQa}
              disabled={selectedRowsCount === 0}
              title="Move selected rows to QC"
            >
              Send To QC{selectedRowsCount > 0 ? ` (${selectedRowsCount})` : ""}
            </button>
            <FilterButton onClick={() => onShowFilterModal(true)} activeFilterCount={activeFilterCount} />
          </div>
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
        customerFilter={jobSearchFilter}
        descriptionFilter=""
        createdByFilter={createdByFilter}
        assignedToFilter={assignedToFilter}
        searchFilterLabel="Search"
        onRemoveFilter={onRemoveFilter}
        trailingAction={
          showClearAll ? (
            <button className="btn-download-csv operator-clear-all-btn" onClick={onClearAllFilters} title="Clear all filters">
              Clear All
            </button>
          ) : null
        }
      />
      <Modal
        isOpen={showRunningJobsModal}
        onClose={() => setShowRunningJobsModal(false)}
        title="Running Jobs"
        size="medium"
        className="operator-running-modal"
      >
        <div className="operator-running-modal-list">
          {runningMachineAlerts.map((alert) => (
            <div
              key={`${alert.machineNumber}-${alert.jobRef}-${alert.quantityLabel}`}
              className="operator-running-modal-card"
            >
              <div className="operator-running-modal-card-header">
                <div className="operator-running-modal-machine">
                  <PrecisionManufacturingRoundedIcon sx={{ fontSize: "1rem" }} />
                </div>
                <div className="operator-running-modal-title-block">
                  <strong>{alert.machineNumber || "-"}</strong>
                  <span>{alert.jobRef || alert.customer || "Running job"}</span>
                </div>
                <span className="operator-running-modal-live-pill">
                  <span className="operator-running-dot" aria-hidden="true" />
                  Running
                </span>
              </div>
              <div className="operator-running-modal-grid">
                <div className="operator-running-modal-meta">
                  <span>Customer</span>
                  <strong>{alert.customer || "-"}</strong>
                </div>
                <div className="operator-running-modal-meta">
                  <span>Qty</span>
                  <strong>{alert.quantityLabel || "-"}</strong>
                </div>
                <div className="operator-running-modal-meta operator-running-modal-meta-wide">
                  <span>Description</span>
                  <strong>{alert.description || "-"}</strong>
                </div>
                <div className="operator-running-modal-meta">
                  <span>Operator</span>
                  <strong>{alert.operatorName || "-"}</strong>
                </div>
                <div className="operator-running-modal-meta">
                  <span>Est. Time</span>
                  <strong>{alert.estimatedTime || "-"}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};
