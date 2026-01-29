import { useCallback } from "react";
import type { FilterValues } from "../../../components/FilterModal";

type UseFilterHandlersProps = {
  setFilters: React.Dispatch<React.SetStateAction<FilterValues>>;
  setCustomerFilter: React.Dispatch<React.SetStateAction<string>>;
  setDescriptionFilter: React.Dispatch<React.SetStateAction<string>>;
  setCreatedByFilter: React.Dispatch<React.SetStateAction<string>>;
};

export const useFilterHandlers = ({
  setFilters,
  setCustomerFilter,
  setDescriptionFilter,
  setCreatedByFilter,
}: UseFilterHandlersProps) => {
  const handleApplyFilters = useCallback(
    (newFilters: FilterValues) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  const handleRemoveFilter = useCallback(
    (key: string, type: "inline" | "modal") => {
      if (type === "inline") {
        if (key === "customer") {
          setCustomerFilter("");
        } else if (key === "description") {
          setDescriptionFilter("");
        } else if (key === "createdBy") {
          setCreatedByFilter("");
        }
      } else {
        setFilters((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      }
    },
    [setFilters, setCustomerFilter, setDescriptionFilter, setCreatedByFilter]
  );

  return {
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter,
  };
};
