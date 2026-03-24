import { useEffect, useMemo, useState } from "react";
import FilterFieldRenderer from "./FilterFieldRenderer";
import Modal from "./Modal";
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

const FilterModal = ({
  isOpen,
  onClose,
  fields,
  initialValues = {},
  onApply,
  onClear,
  categories,
}: FilterModalProps) => {
  const [filterValues, setFilterValues] = useState<FilterValues>(initialValues);
  const [activeCategory, setActiveCategory] = useState<string>("");

  const groupedFields = useMemo(() => {
    const groups: Record<string, FilterField[]> = {};
    fields.forEach((field) => {
      const category = field.category || "general";
      groups[category] ||= [];
      groups[category].push(field);
    });
    return groups;
  }, [fields]);

  const categoryList = useMemo<FilterCategory[]>(() => {
    if (categories?.length) {
      return categories.filter((cat) => groupedFields[cat.id]?.length > 0);
    }
    return Object.keys(groupedFields).map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, " $1"),
    }));
  }, [categories, groupedFields]);

  useEffect(() => {
    if (isOpen) setFilterValues(initialValues);
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (isOpen && Object.keys(groupedFields).length > 0) {
      setActiveCategory(categories?.[0]?.id || Object.keys(groupedFields)[0]);
    }
  }, [isOpen, groupedFields, categories]);

  const handleFieldChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value === "" ? undefined : value }));
  };

  const handleRangeChange = (key: string, type: "min" | "max", value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: { ...prev[key], [type]: value === "" ? undefined : value } }));
  };

  const handleApply = () => {
    const cleanedFilters: FilterValues = {};
    Object.keys(filterValues).forEach((key) => {
      const value = filterValues[key];
      if (value === undefined || value === null || value === "") return;
      if (typeof value === "object" && !Array.isArray(value)) {
        if (value.min !== undefined || value.max !== undefined) cleanedFilters[key] = value;
        return;
      }
      cleanedFilters[key] = value;
    });
    onApply(cleanedFilters);
    onClose();
  };

  const currentFields = groupedFields[activeCategory] || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter Jobs" size="large" className="filter-modal" disableOverlayClick>
      <div className="filter-content">
        <div className="filter-layout">
          {categoryList.length > 1 && (
            <div className="filter-sidebar">
              <div className="filter-categories">
                {categoryList.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`filter-category-tab ${activeCategory === category.id ? "active" : ""}`}
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
              {currentFields.map((field) => (
                <FilterFieldRenderer
                  key={field.key}
                  field={field}
                  value={filterValues[field.key]}
                  onFieldChange={handleFieldChange}
                  onRangeChange={handleRangeChange}
                  setFilterValues={setFilterValues}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="filter-actions">
          <button type="button" className="btn-clear" onClick={() => {
            setFilterValues({});
            onClear();
            onClose();
          }}>
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
