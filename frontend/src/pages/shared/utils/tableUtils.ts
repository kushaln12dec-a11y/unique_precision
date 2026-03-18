import type { JobEntry } from "../../../types/job";
import { getParentRowClassName } from "../../Programmer/utils/priorityUtils";

export type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

/**
 * Get row class name for parent table rows
 * Reused by both Programmer and Operator pages
 */
export const getTableRowClassName = (
  row: TableRow,
  expandedGroups: Set<string>
): string => {
  return getParentRowClassName(
    row.parent,
    row.entries,
    expandedGroups.has(row.groupId)
  );
};
