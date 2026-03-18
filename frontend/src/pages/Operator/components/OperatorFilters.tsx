import React, { useMemo } from "react";
import FilterModal from "../../../components/FilterModal";
import FilterButton from "../../../components/FilterButton";
import FilterBadges from "../../../components/FilterBadges";
import DownloadIcon from "@mui/icons-material/Download";
import { OperatorTaskTimer } from "./OperatorTaskTimer";
import SelectDropdown, { type SelectOption } from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "./MultiSelectOperators";
import type { FilterField, FilterCategory, FilterValues } from "../../../components/FilterModal";
import { getDisplayName, getFirstNameDisplay } from "../../../utils/jobFormatting";

type OperatorFiltersProps = {
  filters: FilterValues;
  filterFields: FilterField[];
  filterCategories: FilterCategory[];
  jobSearchFilter: string;
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
  onJobSearchFilterChange: (value: string) => void;
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
  onTimerRunningChange?: (running: boolean) => void;
  onDownloadCSV: () => void;
  onSendSelectedRowsToQa: () => void;
  selectedRowsCount: number;
  machineOptions: string[];
  currentUserName: string;
  onApplyBulkAssignment: (payload: { operators: string[]; machineNumber: string }) => void;
};

export const OperatorFilters: React.FC<OperatorFiltersProps> = ({
  filters,
  filterFields,
  filterCategories,
  jobSearchFilter,
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
  onJobSearchFilterChange,
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
  machineOptions,
  currentUserName,
  onApplyBulkAssignment,
}) => {
  const [bulkOperators, setBulkOperators] = React.useState<string[]>([]);
  const [bulkMachineNumber, setBulkMachineNumber] = React.useState("");

  const createdByOptions = useMemo<SelectOption[]>(
    () => [
      { label: "All Users", value: "" },
      ...users.map((user) => {
        const displayName = getDisplayName(user.firstName, user.lastName, user.email);
        return { label: displayName, value: displayName };
      }),
    ],
    [users]
  );

  const assignedToOptions = useMemo<SelectOption[]>(() => {
    const source = operatorUsers.length > 0 ? operatorUsers : users;
    const seen = new Set<string>(["", "unassigned"]);
    const options: SelectOption[] = [
      { label: "All", value: "" },
      { label: "Unassigned", value: "Unassigned" },
    ];

    source.forEach((user) => {
      const displayName = getFirstNameDisplay(user.firstName, user.email);
      const key = displayName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push({ label: displayName, value: displayName });
      }
    });

    return options;
  }, [operatorUsers, users]);

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: "All", value: "" },
      { label: "Yet to Start", value: "PENDING_INPUT" },
      { label: "Operation Logged", value: "OP_LOGGED" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "QC Dispatched", value: "QA_DISPATCHED" },
    ],
    []
  );

  const bulkMachineOptions = useMemo<SelectOption[]>(
    () => [
      { label: "Any Machine", value: "" },
      ...machineOptions.map((machine) => ({ label: machine, value: machine })),
    ],
    [machineOptions]
  );

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
                placeholder="Search customer or description..."
                value={jobSearchFilter}
                onChange={(e) => onJobSearchFilterChange(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group operator-filter-created-by">
              <label>Created By</label>
              <SelectDropdown
                value={createdByFilter}
                onChange={onCreatedByFilterChange}
                options={createdByOptions}
                placeholder="All Users"
                align="left"
                className="operator-filter-dropdown"
              />
            </div>
            <div className="filter-group operator-filter-assigned-to">
              <label>Assigned To</label>
              <SelectDropdown
                value={assignedToFilter}
                onChange={onAssignedToFilterChange}
                options={assignedToOptions}
                placeholder="All"
                align="left"
                className="operator-filter-dropdown"
              />
            </div>
            <div className="operator-status-legend-group">
              <div className="filter-group operator-filter-status">
                <label>Status</label>
                <SelectDropdown
                  value={productionStageFilter}
                  onChange={onProductionStageFilterChange}
                  options={statusOptions}
                  placeholder="All"
                  align="left"
                  className="operator-filter-dropdown"
                />
              </div>
            </div>
          </div>
          <div className="operator-stage-legend-inline">
            <span className="operator-stage-legend-title">Stage Legend:</span>
            <span className="operator-stage-chip saved">Operation Logged</span>
            <span className="operator-stage-chip ready">In Progress</span>
            <span className="operator-stage-chip sent">QC Dispatched</span>
            <span className="operator-stage-chip empty">Yet to Start</span>
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
                <MultiSelectOperators
                  selectedOperators={bulkOperators}
                  availableOperators={(operatorUsers.length > 0 ? operatorUsers : users).map((user) => ({
                    id: user._id,
                    name: getFirstNameDisplay(user.firstName, user.email, String(user._id)).toUpperCase(),
                  }))}
                  onChange={setBulkOperators}
                  assignToSelfName={currentUserName || undefined}
                  placeholder="Assign operators"
                  className="operator-bulk-operators"
                  compact
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
                  onClick={() => onApplyBulkAssignment({ operators: bulkOperators, machineNumber: bulkMachineNumber })}
                  disabled={bulkOperators.length === 0 && !bulkMachineNumber}
                  title="Apply selected operators/machine to selected rows"
                >
                  Apply Selected
                </button>
              </div>
            )}
            <button className="btn-download-csv" onClick={onDownloadCSV} title="Download CSV">
              <DownloadIcon sx={{ fontSize: "1rem" }} />
              CSV
            </button>
            <button
              className="btn-download-csv"
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
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
};
