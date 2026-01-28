import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import RangeSlider from "./RangeSlider";
import "./FilterModal.css";

export type FilterField = {
  key: string;
  label: string;
  type: "text" | "number" | "numberRange" | "date" | "dateRange" | "select" | "boolean";
  options?: { value: string; label: string }[];
  placeholder?: string;
  category?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type FilterCategory = {
  id: string;
  label: string;
  icon?: string;
};

export type FilterValues = Record<string, any>;

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fields: FilterField[];
  initialValues?: FilterValues;
  onApply: (filters: FilterValues) => void;
  onClear: () => void;
  categories?: FilterCategory[];
};

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  fields,
  initialValues = {},
  onApply,
  onClear,
  categories,
}) => {
  const [filterValues, setFilterValues] = useState<FilterValues>(initialValues);
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Group fields by category
  const groupedFields = React.useMemo(() => {
    const groups: Record<string, FilterField[]> = {};
    fields.forEach((field) => {
      const category = field.category || "general";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(field);
    });
    return groups;
  }, [fields]);

  // Set default active category
  React.useEffect(() => {
    if (isOpen && Object.keys(groupedFields).length > 0) {
      const firstCategory = categories?.[0]?.id || Object.keys(groupedFields)[0];
      setActiveCategory(firstCategory);
    }
  }, [isOpen, groupedFields, categories]);

  // Get category list
  const categoryList = React.useMemo<FilterCategory[]>(() => {
    if (categories && categories.length > 0) {
      return categories.filter((cat) => groupedFields[cat.id]?.length > 0);
    }
    // Auto-generate categories from field categories
    return Object.keys(groupedFields).map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, " $1"),
    }));
  }, [categories, groupedFields]);

  useEffect(() => {
    if (isOpen) {
      setFilterValues(initialValues);
    }
  }, [isOpen, initialValues]);

  const handleFieldChange = (key: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const handleRangeChange = (key: string, type: "min" | "max", value: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: value === "" ? undefined : value,
      },
    }));
  };

  const handleApply = () => {
    // Clean up empty values
    const cleanedFilters: FilterValues = {};
    Object.keys(filterValues).forEach((key) => {
      const value = filterValues[key];
      if (value !== undefined && value !== null && value !== "") {
        if (typeof value === "object" && !Array.isArray(value)) {
          // Handle range objects
          if (value.min !== undefined || value.max !== undefined) {
            cleanedFilters[key] = value;
          }
        } else {
          cleanedFilters[key] = value;
        }
      }
    });
    onApply(cleanedFilters);
    onClose();
  };

  const handleClear = () => {
    setFilterValues({});
    onClear();
    onClose();
  };

  const renderField = (field: FilterField) => {
    const value = filterValues[field.key];

    switch (field.type) {
      case "text":
        return (
          <div key={field.key} className="filter-field">
            <label>{field.label}</label>
            <input
              type="text"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="filter-field">
            <label>{field.label}</label>
            <input
              type="number"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case "numberRange":
        return (
          <div key={field.key} className="filter-field filter-range">
            <RangeSlider
              min={field.min ?? 0}
              max={field.max ?? 1000}
              value={value || {}}
              onChange={(rangeValue) => {
                setFilterValues((prev) => ({
                  ...prev,
                  [field.key]: rangeValue,
                }));
              }}
              step={field.step ?? 1}
              label={field.label}
              unit={field.unit}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.key} className="filter-field">
            <label>{field.label}</label>
            <input
              type="date"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      case "dateRange":
        return (
          <div key={field.key} className="filter-field filter-range">
            <label>{field.label}</label>
            <div className="range-inputs">
              <input
                type="date"
                value={value?.min || ""}
                onChange={(e) => handleRangeChange(field.key, "min", e.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                value={value?.max || ""}
                onChange={(e) => handleRangeChange(field.key, "max", e.target.value)}
              />
            </div>
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="filter-field">
            <label>{field.label}</label>
            <select
              value={value || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            >
              <option value="">All</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "boolean":
        return (
          <div key={field.key} className="filter-field filter-boolean">
            <label>{field.label}</label>
            <select
              value={value === undefined ? "" : value ? "true" : "false"}
              onChange={(e) =>
                handleFieldChange(
                  field.key,
                  e.target.value === "" ? undefined : e.target.value === "true"
                )
              }
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        );

      default:
        return null;
    }
  };


  const currentFields = groupedFields[activeCategory] || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Jobs"
      size="large"
      className="filter-modal"
      disableOverlayClick={true}
    >
      <div className="filter-content">
        <div className="filter-layout">
          {categoryList.length > 1 && (
            <div className="filter-sidebar">
              <div className="filter-categories">
                {categoryList.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`filter-category-tab ${
                      activeCategory === category.id ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.icon && <span className="category-icon">{category.icon}</span>}
                    <span className="category-label">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="filter-main">
            <div className="filter-fields">
              {currentFields.map((field) => renderField(field))}
            </div>
          </div>
        </div>
        <div className="filter-actions">
          <button type="button" className="btn-clear" onClick={handleClear}>
            Clear All
          </button>
          <button type="button" className="btn-apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FilterModal;
