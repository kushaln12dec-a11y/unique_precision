import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { groupJobs, sortGroups, transformToTableRows, type TableRow } from "../utils/jobDataTransform";
import ChildCutsTable from "../components/ChildCutsTable";

type UseJobDataProps = {
  jobs: JobEntry[];
  sortField: keyof JobEntry | null;
  sortDirection: "asc" | "desc";
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  isAdmin?: boolean;
  onEdit?: (groupId: string) => void;
  onDelete?: (groupId: string, customer: string) => void;
  onViewJob?: (entry: JobEntry) => void;
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
  isAdmin = false,
  onEdit,
  onDelete,
  onViewJob,
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
    const map = new Map<string, any>();
    tableData.forEach((row) => {
      const childEntries = row.entries.slice(1);
      const hasChildren = childEntries.length > 0;
      if (hasChildren) {
        map.set(row.groupId, {
          isExpanded: expandedGroups.has(row.groupId),
          onToggle: () => toggleGroup(row.groupId),
          expandedContent: (
            <ChildCutsTable 
              entries={childEntries} 
              parentSetting={String(row.parent.setting || "").trim()}
              showSetNumberColumn={false}
              onViewJob={onViewJob}
              onEdit={onEdit}
              onDelete={onDelete}
              isAdmin={isAdmin}
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
    onViewJob,
    isAdmin,
    showChildCheckboxes,
    selectedChildRows,
    onChildRowSelect,
  ]);

  return {
    tableData,
    expandableRows,
  };
};
