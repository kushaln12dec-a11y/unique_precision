import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { groupJobs, sortGroups, transformToTableRows, type TableRow } from "../utils/jobDataTransform";
import ChildCutsTable from "../components/ChildCutsTable";

type UseJobDataProps = {
  jobs: JobEntry[];
  sortField: keyof JobEntry | null;
  sortDirection: "asc" | "desc";
  expandedGroups: Set<number>;
  toggleGroup: (groupId: number) => void;
  onEdit?: (groupId: number) => void;
  onDelete?: (groupId: number, customer: string) => void;
  showChildCheckboxes?: boolean;
  selectedChildRows?: Set<string | number>;
  onChildRowSelect?: (rowKey: string | number, selected: boolean) => void;
};

export const useJobData = ({
  jobs,
  sortField,
  sortDirection,
  expandedGroups,
  toggleGroup,
  onEdit,
  onDelete,
  childSortField,
  childSortDirection = "asc",
  onChildSort,
  showChildCheckboxes = false,
  selectedChildRows = new Set(),
  onChildRowSelect,
}: UseJobDataProps) => {
  const filteredJobs = useMemo(() => jobs, [jobs]);

  const groupedJobs = useMemo(() => groupJobs(filteredJobs), [filteredJobs]);

  const sortedGroups = useMemo(
    () => sortGroups(groupedJobs, sortField, sortDirection),
    [groupedJobs, sortField, sortDirection]
  );

  const tableData = useMemo<TableRow[]>(() => transformToTableRows(sortedGroups), [sortedGroups]);

  const expandableRows = useMemo(() => {
    const map = new Map<number, any>();
    tableData.forEach((row) => {
      const hasChildren = row.entries.length > 1;
      if (hasChildren) {
        map.set(row.groupId, {
          isExpanded: expandedGroups.has(row.groupId),
          onToggle: () => toggleGroup(row.groupId),
          expandedContent: (
            <ChildCutsTable 
              entries={row.entries} 
              onEdit={onEdit} 
              onDelete={onDelete}
              showCheckboxes={showChildCheckboxes}
              selectedRows={selectedChildRows}
              onRowSelect={onChildRowSelect}
              getRowKey={(entry, index) => entry.id || index}
            />
          ),
          ariaLabel: expandedGroups.has(row.groupId) ? "Collapse settings" : "Expand settings",
        });
      }
    });
    return map;
  }, [
    tableData, 
    expandedGroups, 
    toggleGroup, 
    onEdit, 
    onDelete,
    showChildCheckboxes,
    selectedChildRows,
    onChildRowSelect,
  ]);

  return {
    tableData,
    expandableRows,
  };
};
