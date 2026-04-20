import type { FilterValues } from "../../../components/FilterModal";
import {
  setProgrammerCreatedByFilter,
  setProgrammerCriticalFilter,
  setProgrammerCustomerFilter,
  setProgrammerDescriptionFilter,
  setProgrammerFilters,
  setProgrammerShowFilterModal,
} from "../../../store/slices/filtersSlice";

type Dispatch = (action: any) => void;

export const useProgrammerReduxDispatchers = (dispatch: Dispatch, filters: FilterValues) => ({
  setShowFilterModal: (show: boolean) => dispatch(setProgrammerShowFilterModal(show)),
  applyFilters: (newFilters: FilterValues) => dispatch(setProgrammerFilters(newFilters)),
  clearFilters: () => dispatch(setProgrammerFilters({})),
  clearAllFilters: () => {
    dispatch(setProgrammerFilters({}));
    dispatch(setProgrammerCustomerFilter(""));
    dispatch(setProgrammerDescriptionFilter(""));
    dispatch(setProgrammerCreatedByFilter(""));
    dispatch(setProgrammerCriticalFilter(false));
    dispatch(setProgrammerShowFilterModal(false));
  },
  removeFilter: (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer") {
        dispatch(setProgrammerCustomerFilter(""));
        dispatch(setProgrammerDescriptionFilter(""));
      }
      else if (key === "description") dispatch(setProgrammerDescriptionFilter(""));
      else if (key === "createdBy") dispatch(setProgrammerCreatedByFilter(""));
      return;
    }
    const updated = { ...filters };
    delete updated[key];
    dispatch(setProgrammerFilters(updated));
  },
  setCustomerDescriptionFilter: (value: string) => {
    dispatch(setProgrammerCustomerFilter(value));
    dispatch(setProgrammerDescriptionFilter(value));
  },
  setCreatedByFilter: (value: string) => dispatch(setProgrammerCreatedByFilter(value)),
  setCriticalFilter: (value: boolean) => dispatch(setProgrammerCriticalFilter(value)),
});
