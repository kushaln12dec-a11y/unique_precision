import { useState, useMemo } from "react";
import type { FilterValues, FilterField, FilterCategory } from "../../../components/FilterModal";
import { countActiveFilters } from "../../../utils/filterUtils";

/**
 * Hook for managing operator filters
 */
export const useOperatorFilters = () => {
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [productionStageFilter, setProductionStageFilter] = useState("");

  const filterCategories: FilterCategory[] = [
    { id: "dimensions", label: "Dimensions", icon: "📏" },
    { id: "production", label: "Production", icon: "⚙️" },
    { id: "financial", label: "Financial", icon: "💰" },
    { id: "dates", label: "Dates", icon: "📅" },
  ];

  const filterFields: FilterField[] = [
    {
      key: "cut",
      label: "Cut (mm)",
      type: "numberRange",
      category: "dimensions",
      min: 0,
      max: 1000,
      step: 0.1,
      unit: "mm",
    },
    {
      key: "thickness",
      label: "Thickness (mm)",
      type: "numberRange",
      category: "dimensions",
      min: 0,
      max: 500,
      step: 0.1,
      unit: "mm",
    },
    {
      key: "passLevel",
      label: "Pass Level",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5" },
        { value: "6", label: "6" },
      ],
      category: "production",
    },
    {
      key: "setting",
      label: "Setting",
      type: "text",
      placeholder: "Enter setting",
      category: "production",
    },
    {
      key: "qty",
      label: "Quantity",
      type: "numberRange",
      category: "production",
      min: 0,
      max: 10000,
      step: 1,
    },
    {
      key: "rate",
      label: "Rate (₹)",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 100000,
      step: 0.01,
      unit: "₹",
    },
    {
      key: "totalHrs",
      label: "Total Hours",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 1000,
      step: 0.001,
      unit: "hrs",
    },
    {
      key: "totalAmount",
      label: "Total Amount (₹)",
      type: "numberRange",
      category: "financial",
      min: 0,
      max: 1000000,
      step: 0.01,
      unit: "₹",
    },
    {
      key: "createdAt",
      label: "Created Date",
      type: "dateRange",
      category: "dates",
    },
  ];

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setCustomerFilter("");
    setDescriptionFilter("");
    setCreatedByFilter("");
    setAssignedToFilter("");
    setProductionStageFilter("");
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleRemoveFilter = (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer") {
        setCustomerFilter("");
      } else if (key === "description") {
        setDescriptionFilter("");
      } else if (key === "createdBy") {
        setCreatedByFilter("");
      } else if (key === "assignedTo") {
        setAssignedToFilter("");
      } else if (key === "productionStage") {
        setProductionStageFilter("");
      }
    } else {
      // Modal filter
      setFilters((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  return {
    filters,
    setFilters,
    showFilterModal,
    setShowFilterModal,
    customerFilter,
    setCustomerFilter,
    descriptionFilter,
    setDescriptionFilter,
    createdByFilter,
    setCreatedByFilter,
    assignedToFilter,
    setAssignedToFilter,
    productionStageFilter,
    setProductionStageFilter,
    filterCategories,
    filterFields,
    activeFilterCount,
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter,
  };
};
