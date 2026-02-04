import React from "react";
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
  createdByFilter: string;
  assignedToFilter: string;
  showFilterModal: boolean;
  activeFilterCount: number;
  users: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  operatorUsers: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
  canAssign: boolean;
  onShowFilterModal: (show: boolean) => void;
  onApplyFilters: (filters: FilterValues) => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: string, type: "inline" | "modal") => void;
  onCustomerFilterChange: (value: string) => void;
  onCreatedByFilterChange: (value: string) => void;
  onAssignedToFilterChange: (value: string) => void;
  onDownloadCSV: () => void;
};

export const OperatorFilters: React.FC<OperatorFiltersProps> = ({
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
  canAssign,
  onShowFilterModal,
  onApplyFilters,
  onClearFilters,
  onRemoveFilter,
  onCustomerFilterChange,
  onCreatedByFilterChange,
  onAssignedToFilterChange,
  onDownloadCSV,
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
            <label htmlFor="assigned-to-select">Assigned To</label>
            <select
              id="assigned-to-select"
              value={assignedToFilter}
              onChange={(e) => onAssignedToFilterChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="Unassigned">Unassigned</option>
              {operatorUsers.length > 0 ? (
                operatorUsers.map((user) => {
                  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                  return (
                    <option key={user._id} value={displayName}>
                      {displayName}
                    </option>
                  );
                })
              ) : (
                users.map((user) => {
                  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
                  return (
                    <option key={user._id} value={displayName}>
                      {displayName}
                    </option>
                  );
                })
              )}
            </select>
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
        assignedToFilter={assignedToFilter}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
};
