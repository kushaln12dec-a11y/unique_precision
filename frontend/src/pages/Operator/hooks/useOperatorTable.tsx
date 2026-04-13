import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import type { Column } from "../../../components/DataTable";
import type { OperatorTableRow } from "../types";
import type { EmployeeLog } from "../../../types/employeeLog";
import {
  getOperatorMachineDropdownOptions,
} from "../utils/operatorTableHelpers";
import { buildBaseOperatorColumns } from "../utils/operatorTableColumns";

export type OperatorDisplayRow = {
  kind: "parent" | "child";
  groupId: string;
  tableRow: OperatorTableRow;
  entry: JobEntry;
  childIndex: number | null;
  hasChildren: boolean;
  isExpanded: boolean;
};

type UseOperatorTableProps = {
  canAssign: boolean;
  canOperateInputs: boolean;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  handleAssignChange: (jobId: number | string, value: string | string[]) => void;
  handleMachineNumberChange: (groupId: string, machineNumber: string) => void;
  handleChildMachineNumberChange: (jobId: number | string, machineNumber: string) => void;
  handleViewJob: (row: OperatorTableRow) => void;
  handleViewEntry: (entry: JobEntry) => void;
  handleSubmit: (groupId: string) => void;
  handleImageInput: (groupId: string, cutId?: string | number) => void;
  handleOpenQaModal: (entries: JobEntry[]) => void;
  isAdmin: boolean;
  isImageInputDisabled: boolean;
  toggleGroup: (groupId: string) => void;
  activeRunsByJobId: Map<string, EmployeeLog>;
  operatorHistoryByJobId: Map<string, string[]>;
};

export const useOperatorTable = ({
  canAssign,
  canOperateInputs,
  operatorUsers,
  machineOptions,
  handleAssignChange,
  handleMachineNumberChange,
  handleChildMachineNumberChange,
  handleViewJob,
  handleViewEntry,
  handleSubmit,
  handleImageInput,
  handleOpenQaModal,
  isAdmin,
  isImageInputDisabled,
  toggleGroup,
  activeRunsByJobId,
  operatorHistoryByJobId,
}: UseOperatorTableProps): Column<OperatorDisplayRow>[] => {
  const machineDropdownOptions = useMemo(() => getOperatorMachineDropdownOptions(machineOptions), [machineOptions]);

  const operatorNameLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    operatorUsers.forEach((user) => {
      const fullName = String(user.name || "").trim();
      if (!fullName) return;
      lookup.set(fullName.toLowerCase(), fullName);
      const firstToken = fullName.split(/\s+/).filter(Boolean)[0];
      if (firstToken) {
        lookup.set(firstToken.toLowerCase(), fullName);
      }
    });
    return lookup;
  }, [operatorUsers]);

  return useMemo<Column<OperatorDisplayRow>[]>(
    () => buildBaseOperatorColumns({
      toggleGroup,
      operatorNameLookup,
      canAssign,
      operatorUsers,
      handleAssignChange,
      machineDropdownOptions,
      handleMachineNumberChange,
      handleChildMachineNumberChange,
      isAdmin,
      handleViewJob,
      handleViewEntry,
      handleSubmit,
      handleImageInput,
      handleOpenQaModal,
      isImageInputDisabled,
      canOperateInputs,
      activeRunsByJobId,
      operatorHistoryByJobId,
    }),
    [
      canAssign,
      canOperateInputs,
      operatorUsers,
      machineDropdownOptions,
      handleAssignChange,
      handleMachineNumberChange,
      handleChildMachineNumberChange,
      handleViewJob,
      handleViewEntry,
      handleSubmit,
      handleImageInput,
      handleOpenQaModal,
      isAdmin,
      isImageInputDisabled,
      activeRunsByJobId,
      operatorHistoryByJobId,
      operatorNameLookup,
      toggleGroup,
    ]
  );
};
