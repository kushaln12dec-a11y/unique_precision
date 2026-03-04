import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FilterValues } from "../../components/FilterModal";

type ProgrammerFiltersState = {
  filters: FilterValues;
  showFilterModal: boolean;
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
  criticalFilter: boolean;
};

type OperatorFiltersState = {
  filters: FilterValues;
  showFilterModal: boolean;
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
  assignedToFilter: string;
  productionStageFilter: string;
};

type QcFiltersState = {
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
};

export type FiltersState = {
  programmer: ProgrammerFiltersState;
  operator: OperatorFiltersState;
  qc: QcFiltersState;
};

const initialState: FiltersState = {
  programmer: {
    filters: {},
    showFilterModal: false,
    customerFilter: "",
    descriptionFilter: "",
    createdByFilter: "",
    criticalFilter: false,
  },
  operator: {
    filters: {},
    showFilterModal: false,
    customerFilter: "",
    descriptionFilter: "",
    createdByFilter: "",
    assignedToFilter: "",
    productionStageFilter: "",
  },
  qc: {
    customerFilter: "",
    descriptionFilter: "",
    createdByFilter: "",
  },
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setProgrammerFilters(state, action: PayloadAction<FilterValues>) {
      state.programmer.filters = action.payload;
    },
    clearProgrammerFilters(state) {
      state.programmer.filters = {};
    },
    setProgrammerShowFilterModal(state, action: PayloadAction<boolean>) {
      state.programmer.showFilterModal = action.payload;
    },
    setProgrammerCustomerFilter(state, action: PayloadAction<string>) {
      state.programmer.customerFilter = action.payload;
    },
    setProgrammerDescriptionFilter(state, action: PayloadAction<string>) {
      state.programmer.descriptionFilter = action.payload;
    },
    setProgrammerCreatedByFilter(state, action: PayloadAction<string>) {
      state.programmer.createdByFilter = action.payload;
    },
    setProgrammerCriticalFilter(state, action: PayloadAction<boolean>) {
      state.programmer.criticalFilter = action.payload;
    },
    setOperatorFilters(state, action: PayloadAction<FilterValues>) {
      state.operator.filters = action.payload;
    },
    clearOperatorFilters(state) {
      state.operator.filters = {};
    },
    setOperatorShowFilterModal(state, action: PayloadAction<boolean>) {
      state.operator.showFilterModal = action.payload;
    },
    setOperatorCustomerFilter(state, action: PayloadAction<string>) {
      state.operator.customerFilter = action.payload;
    },
    setOperatorDescriptionFilter(state, action: PayloadAction<string>) {
      state.operator.descriptionFilter = action.payload;
    },
    setOperatorCreatedByFilter(state, action: PayloadAction<string>) {
      state.operator.createdByFilter = action.payload;
    },
    setOperatorAssignedToFilter(state, action: PayloadAction<string>) {
      state.operator.assignedToFilter = action.payload;
    },
    setOperatorProductionStageFilter(state, action: PayloadAction<string>) {
      state.operator.productionStageFilter = action.payload;
    },
    setQcCustomerFilter(state, action: PayloadAction<string>) {
      state.qc.customerFilter = action.payload;
    },
    setQcDescriptionFilter(state, action: PayloadAction<string>) {
      state.qc.descriptionFilter = action.payload;
    },
    setQcCreatedByFilter(state, action: PayloadAction<string>) {
      state.qc.createdByFilter = action.payload;
    },
  },
});

export const {
  setProgrammerFilters,
  clearProgrammerFilters,
  setProgrammerShowFilterModal,
  setProgrammerCustomerFilter,
  setProgrammerDescriptionFilter,
  setProgrammerCreatedByFilter,
  setProgrammerCriticalFilter,
  setOperatorFilters,
  clearOperatorFilters,
  setOperatorShowFilterModal,
  setOperatorCustomerFilter,
  setOperatorDescriptionFilter,
  setOperatorCreatedByFilter,
  setOperatorAssignedToFilter,
  setOperatorProductionStageFilter,
  setQcCustomerFilter,
  setQcDescriptionFilter,
  setQcCreatedByFilter,
} = filtersSlice.actions;

export default filtersSlice.reducer;
