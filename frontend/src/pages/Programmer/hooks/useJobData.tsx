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
};

export const useJobData = ({
  jobs,
  sortField,
  sortDirection,
  expandedGroups,
  toggleGroup,
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
          expandedContent: <ChildCutsTable entries={row.entries} />,
          ariaLabel: expandedGroups.has(row.groupId) ? "Collapse cuts" : "Expand cuts",
        });
      }
    });
    return map;
  }, [tableData, expandedGroups, toggleGroup]);

  return {
    tableData,
    expandableRows,
  };
};
