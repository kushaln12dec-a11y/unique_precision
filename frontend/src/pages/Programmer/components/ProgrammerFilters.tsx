import React from "react";
import FilterModal from "../../../components/FilterModal";
import FilterButton from "../../../components/FilterButton";
import FilterBadges from "../../../components/FilterBadges";
import DownloadIcon from "@mui/icons-material/Download";
import type { FilterValues } from "../../../components/FilterModal";
import { filterFields, filterCategories } from "../config/filterConfig";

type ProgrammerFiltersProps = {
  filters: FilterValues;
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
  criticalFilter: boolean;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  onShowFilterModal: (show: boolean) => void;
  onApplyFilters: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: string, type: "inline" | "modal") => void;
  onCustomerFilterChange: (value: string) => void;
  onDescriptionFilterChange: (value: string) => void;
  onCreatedByFilterChange: (value: string) => void;
  onCriticalFilterChange: (checked: boolean) => void;
  onDownloadCSV: () => void;
  onNewJob: () => void;
};

export const ProgrammerFilters: React.FC<ProgrammerFiltersProps> = ({
  filters,
  customerFilter,
  descriptionFilter,
  createdByFilter,
  criticalFilter,
  showFilterModal,
  activeFilterCount,
  users,
  onShowFilterModal,
  onApplyFilters,
  onClearFilters,
  onRemoveFilter,
  onCustomerFilterChange,
  onDescriptionFilterChange,
  onCreatedByFilterChange,
  onCriticalFilterChange,
  onDownloadCSV,
  onNewJob,
}) => {
  return (
    <>
      <div className="panel-header">
        <div className="inline-filters">
          <div className="filter-group">
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
          <div className="filter-group">
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
          <div className="filter-group">
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
          <div className="filter-group">
            <label htmlFor="critical-filter" className="critical-filter-label">
              <input
                id="critical-filter"
                type="checkbox"
                checked={criticalFilter}
                onChange={(e) => onCriticalFilterChange(e.target.checked)}
                className="critical-checkbox"
              />
              Complex
            </label>
          </div>
        </div>
        <div className="panel-header-actions">
          <button
            className="btn-download-csv"
            onClick={onDownloadCSV}
            title="Download CSV"
          >
            <DownloadIcon sx={{ fontSize: "1rem" }} />
            CSV
          </button>
          <FilterButton
            onClick={() => onShowFilterModal(true)}
            activeFilterCount={activeFilterCount}
          />
          <button className="btn-new-job" onClick={onNewJob}>
            Add New Job
          </button>
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
        createdByFilter={createdByFilter}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
};
