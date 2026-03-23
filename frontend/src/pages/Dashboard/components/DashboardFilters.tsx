import { useEffect, useId, useState } from "react";
import type { DashboardDateRangePreset } from "../../../types/dashboard";
import { DASHBOARD_DATE_RANGE_OPTIONS } from "../utils/dateRangeFilter";

type DashboardFilterValues = {
  customer: string;
  machine: string;
  operator: string;
  programmer: string;
};

type DashboardFilterKey = keyof DashboardFilterValues;

type DashboardFiltersProps = {
  range: DashboardDateRangePreset;
  customStartDate: string;
  customEndDate: string;
  filters: DashboardFilterValues;
  options: {
    customers: string[];
    machines: string[];
    operators: string[];
    programmers: string[];
  };
  onRangeChange: (value: DashboardDateRangePreset) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onFilterChange: (key: DashboardFilterKey, value: string) => void;
  onReset: () => void;
};

const DashboardFilters = ({
  range,
  customStartDate,
  customEndDate,
  filters,
  options,
  onRangeChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onFilterChange,
  onReset,
}: DashboardFiltersProps) => {
  const id = useId();
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    const changedEntries = (Object.keys(draftFilters) as DashboardFilterKey[])
      .filter((key) => draftFilters[key] !== filters[key])
      .map((key) => ({ key, value: draftFilters[key] }));

    if (!changedEntries.length) return;

    const timeout = window.setTimeout(() => {
      changedEntries.forEach(({ key, value }) => onFilterChange(key, value));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draftFilters, filters, onFilterChange]);

  const handleDraftChange = (key: DashboardFilterKey, value: string) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setDraftFilters({
      customer: "",
      machine: "",
      operator: "",
      programmer: "",
    });
    onReset();
  };

  return (
    <div className="dashboard-filter-bar">
      <select value={range} onChange={(event) => onRangeChange(event.target.value as DashboardDateRangePreset)}>
        {DASHBOARD_DATE_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {range === "CUSTOM" ? (
        <>
          <input type="date" value={customStartDate} onChange={(event) => onCustomStartDateChange(event.target.value)} />
          <input type="date" value={customEndDate} onChange={(event) => onCustomEndDateChange(event.target.value)} />
        </>
      ) : null}

      <input
        type="text"
        list={`dashboard-customers-${id}`}
        value={draftFilters.customer}
        onChange={(event) => handleDraftChange("customer", event.target.value)}
        placeholder="Filter customer"
        aria-label="Filter by customer"
      />
      <datalist id={`dashboard-customers-${id}`}>
        {options.customers.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <input
        type="text"
        list={`dashboard-machines-${id}`}
        value={draftFilters.machine}
        onChange={(event) => handleDraftChange("machine", event.target.value)}
        placeholder="Filter machine"
        aria-label="Filter by machine"
      />
      <datalist id={`dashboard-machines-${id}`}>
        {options.machines.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <input
        type="text"
        list={`dashboard-operators-${id}`}
        value={draftFilters.operator}
        onChange={(event) => handleDraftChange("operator", event.target.value)}
        placeholder="Filter operator"
        aria-label="Filter by operator"
      />
      <datalist id={`dashboard-operators-${id}`}>
        {options.operators.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <input
        type="text"
        list={`dashboard-programmers-${id}`}
        value={draftFilters.programmer}
        onChange={(event) => handleDraftChange("programmer", event.target.value)}
        placeholder="Filter programmer"
        aria-label="Filter by programmer"
      />
      <datalist id={`dashboard-programmers-${id}`}>
        {options.programmers.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </datalist>

      <button type="button" className="dashboard-chip-button ghost" onClick={handleReset}>
        Reset
      </button>
    </div>
  );
};

export default DashboardFilters;
