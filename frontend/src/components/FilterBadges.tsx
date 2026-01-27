import React from "react";
import type { FilterValues } from "./FilterModal";
import type { FilterField } from "./FilterModal";
import { formatDateLabel } from "../utils/date";
import "./FilterBadges.css";

type FilterBadge = {
  key: string;
  label: string;
  value: string;
  type: "inline" | "modal";
};

type FilterBadgesProps = {
  filters: FilterValues;
  filterFields: FilterField[];
  customerFilter?: string;
  createdByFilter?: string;
  assignedToFilter?: string;
  onRemoveFilter: (key: string, type: "inline" | "modal") => void;
};

const FilterBadges: React.FC<FilterBadgesProps> = ({
  filters,
  filterFields,
  customerFilter,
  createdByFilter,
  assignedToFilter,
  onRemoveFilter,
}) => {
  const badges: FilterBadge[] = [];

  // Add inline filter badges
  if (customerFilter) {
    badges.push({
      key: "customer",
      label: "Customer",
      value: customerFilter,
      type: "inline",
    });
  }

  if (createdByFilter) {
    badges.push({
      key: "createdBy",
      label: "Created By",
      value: createdByFilter,
      type: "inline",
    });
  }

  if (assignedToFilter) {
    badges.push({
      key: "assignedTo",
      label: "Assigned To",
      value: assignedToFilter,
      type: "inline",
    });
  }

  // Add modal filter badges
  Object.keys(filters).forEach((key) => {
    const filterValue = filters[key];
    const field = filterFields.find((f) => f.key === key);

    if (!field) return;

    let displayValue = "";

    // Handle range filters
    if (typeof filterValue === "object" && !Array.isArray(filterValue) && filterValue !== null) {
      const { min, max } = filterValue;
      
      if (key === "createdAt") {
        // Date range - format ISO dates to "DD MMM YYYY"
        if (min && max) {
          const minDate = formatDateLabel(new Date(min as string));
          const maxDate = formatDateLabel(new Date(max as string));
          displayValue = `${minDate} to ${maxDate}`;
        } else if (min) {
          const minDate = formatDateLabel(new Date(min as string));
          displayValue = `From ${minDate}`;
        } else if (max) {
          const maxDate = formatDateLabel(new Date(max as string));
          displayValue = `Until ${maxDate}`;
        }
      } else {
        // Number range
        const unit = field.unit || "";
        if (min !== undefined && max !== undefined) {
          displayValue = `${min}${unit} - ${max}${unit}`;
        } else if (min !== undefined) {
          displayValue = `≥ ${min}${unit}`;
        } else if (max !== undefined) {
          displayValue = `≤ ${max}${unit}`;
        }
      }
    } else if (typeof filterValue === "string" && filterValue.trim() !== "") {
      // Text/select filters
      displayValue = filterValue;
    } else if (typeof filterValue === "boolean") {
      // Boolean filters
      displayValue = filterValue ? "Yes" : "No";
    } else if (typeof filterValue === "number") {
      // Number filters
      displayValue = String(filterValue);
    }

    if (displayValue) {
      badges.push({
        key,
        label: field.label,
        value: displayValue,
        type: "modal",
      });
    }
  });

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="filter-badges-container">
      {badges.map((badge) => (
        <div key={`${badge.type}-${badge.key}`} className="filter-badge">
          <span className="filter-badge-label">{badge.label}:</span>
          <span className="filter-badge-value">{badge.value}</span>
          <button
            type="button"
            className="filter-badge-remove"
            onClick={() => onRemoveFilter(badge.key, badge.type)}
            aria-label={`Remove ${badge.label} filter`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default FilterBadges;
