import { useMemo } from "react";
import type { FilterValues, FilterField, FilterCategory } from "../../../components/FilterModal";
import { countActiveFilters } from "../../../utils/filterUtils";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  clearOperatorFilters,
  setOperatorAssignedToFilter,
  setOperatorCreatedByFilter,
  setOperatorCustomerFilter,
  setOperatorDescriptionFilter,
  setOperatorFilters,
  setOperatorShowFilterModal,
} from "../../../store/slices/filtersSlice";

export const useOperatorFilters = () => {
  const dispatch = useAppDispatch();
  const {
    filters,
    showFilterModal,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    assignedToFilter,
  } = useAppSelector((state) => state.filters.operator);

  const filterCategories: FilterCategory[] = [
    { id: "dimensions", label: "Dimensions", icon: "📏" },
    { id: "production", label: "Production", icon: "⚙️" },
    { id: "financial", label: "Financial", icon: "💰" },
    { id: "dates", label: "Dates", icon: "📅" },
  ];

  const filterFields: FilterField[] = [
    { key: "cut", label: "Cut (mm)", type: "numberRange", category: "dimensions", min: 0, max: 1000, step: 0.1, unit: "mm" },
    { key: "thickness", label: "Thickness (mm)", type: "numberRange", category: "dimensions", min: 0, max: 500, step: 0.1, unit: "mm" },
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
    { key: "setting", label: "Setting", type: "text", placeholder: "Enter setting", category: "production" },
    { key: "qty", label: "Quantity", type: "numberRange", category: "production", min: 0, max: 10000, step: 1 },
    { key: "rate", label: "Rate (Rs.)", type: "numberRange", category: "financial", min: 0, max: 100000, step: 0.01, unit: "Rs." },
    { key: "totalHrs", label: "Total Hours", type: "numberRange", category: "financial", min: 0, max: 1000, step: 0.001, unit: "hrs" },
    { key: "totalAmount", label: "Total Amount (Rs.)", type: "numberRange", category: "financial", min: 0, max: 1000000, step: 0.01, unit: "Rs." },
    { key: "createdAt", label: "Created Date", type: "dateRange", category: "dates" },
  ];

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleApplyFilters = (newFilters: FilterValues) => {
    dispatch(setOperatorFilters(newFilters));
    dispatch(setOperatorCustomerFilter(""));
    dispatch(setOperatorDescriptionFilter(""));
    dispatch(setOperatorCreatedByFilter(""));
    dispatch(setOperatorAssignedToFilter(""));
  };

  const handleClearFilters = () => {
    dispatch(clearOperatorFilters());
  };

  const handleRemoveFilter = (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer" || key === "description" || key === "search") {
        dispatch(setOperatorCustomerFilter(""));
        dispatch(setOperatorDescriptionFilter(""));
      }
      else if (key === "createdBy") dispatch(setOperatorCreatedByFilter(""));
      else if (key === "assignedTo") dispatch(setOperatorAssignedToFilter(""));
      return;
    }

    const updated = { ...filters };
    delete updated[key];
    dispatch(setOperatorFilters(updated));
  };

  return {
    filters,
    setFilters: (newFilters: FilterValues) => dispatch(setOperatorFilters(newFilters)),
    showFilterModal,
    setShowFilterModal: (show: boolean) => dispatch(setOperatorShowFilterModal(show)),
    customerFilter,
    setCustomerFilter: (value: string) => dispatch(setOperatorCustomerFilter(value)),
    descriptionFilter,
    setDescriptionFilter: (value: string) => dispatch(setOperatorDescriptionFilter(value)),
    createdByFilter,
    setCreatedByFilter: (value: string) => dispatch(setOperatorCreatedByFilter(value)),
    assignedToFilter,
    setAssignedToFilter: (value: string) => dispatch(setOperatorAssignedToFilter(value)),
    filterCategories,
    filterFields,
    activeFilterCount,
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter,
  };
};
