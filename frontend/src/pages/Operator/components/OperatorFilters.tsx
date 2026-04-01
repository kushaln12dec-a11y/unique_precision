import React, { useMemo } from "react";
import FilterModal from "../../../components/FilterModal";
import FilterButton from "../../../components/FilterButton";
import FilterBadges from "../../../components/FilterBadges";
import DownloadIcon from "@mui/icons-material/Download";
import { OperatorTaskTimer } from "./OperatorTaskTimer";
import SelectDropdown, { type SelectOption } from "../../Programmer/components/SelectDropdown";
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
}) => {
  const [bulkOperator, setBulkOperator] = React.useState("");
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
    const seen = new Set<string>(["", "unassigned", "unassign"]);
    const options: SelectOption[] = [
      { label: "All", value: "" },
      { label: "Unassign", value: "Unassign" },
    ];

    source.forEach((user) => {
      const displayName = getDisplayName(user.firstName, user.lastName, user.email);
      const key = displayName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push({ label: displayName, value: displayName });
      }
    });

    return options;
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
          </div>
          <div className="operator-stage-legend-inline">
            <span className="operator-stage-legend-title">Stage Legend:</span>
            <span className="operator-stage-chip empty">Yet to Start</span>
            <span className="operator-stage-chip ready">In Progress</span>
            <span className="operator-stage-chip saved">Logged</span>
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
      />
    </>
  );
};
