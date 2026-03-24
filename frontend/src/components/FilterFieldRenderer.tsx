import type { Dispatch, SetStateAction } from "react";
import RangeSlider from "./RangeSlider";
import type { FilterField, FilterValues } from "./FilterModal";

type FilterFieldRendererProps = {
  field: FilterField;
  value: any;
  onFieldChange: (key: string, value: any) => void;
  onRangeChange: (key: string, type: "min" | "max", value: string) => void;
  setFilterValues: Dispatch<SetStateAction<FilterValues>>;
};

const FilterFieldRenderer = ({
  field,
  value,
  onFieldChange,
  onRangeChange,
  setFilterValues,
}: FilterFieldRendererProps) => {
  switch (field.type) {
    case "text":
    case "number":
    case "date":
      return (
        <div key={field.key} className="filter-field">
          <label>{field.label}</label>
          <input
            type={field.type}
            value={value || ""}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
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
            onChange={(rangeValue) => setFilterValues((prev) => ({ ...prev, [field.key]: rangeValue }))}
            step={field.step ?? 1}
            label={field.label}
            unit={field.unit}
          />
        </div>
      );
    case "dateRange":
      return (
        <div key={field.key} className="filter-field filter-range">
          <label>{field.label}</label>
          <div className="range-inputs">
            <input type="date" value={value?.min || ""} onChange={(e) => onRangeChange(field.key, "min", e.target.value)} />
            <span>to</span>
            <input type="date" value={value?.max || ""} onChange={(e) => onRangeChange(field.key, "max", e.target.value)} />
          </div>
        </div>
      );
    case "select":
      return (
        <div key={field.key} className="filter-field">
          <label>{field.label}</label>
          <select value={value || ""} onChange={(e) => onFieldChange(field.key, e.target.value)}>
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
            onChange={(e) => onFieldChange(field.key, e.target.value === "" ? undefined : e.target.value === "true")}
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

export default FilterFieldRenderer;
