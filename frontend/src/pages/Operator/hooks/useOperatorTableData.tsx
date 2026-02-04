import React, { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { parseDateValue } from "../../../utils/date";
import ChildCutsTable from "../../Programmer/components/ChildCutsTable";

type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

type UseOperatorTableDataReturn = {
  tableData: TableRow[];
  expandableRows: Map<number, any>;
};

/**
 * Hook for processing operator table data (grouping, sorting, etc.)
 */
export const useOperatorTableData = (
  jobs: JobEntry[],
  sortField: keyof JobEntry | null,
  sortDirection: "asc" | "desc",
  expandedGroups: Set<number>,
  toggleGroup: (groupId: number) => void,
  handleImageInput: (groupId: number, cutId?: number) => void,
  handleAssignChange: (jobId: number | string, value: string) => void,
  operatorUsers: Array<{ id: string | number; name: string }>
): UseOperatorTableDataReturn => {
  // Group jobs by groupId
  const groupedJobs = useMemo(() => {
    const groups = new Map<number, JobEntry[]>();
    jobs.forEach((job) => {
      const key = job.groupId ?? job.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(job);
    });
    return Array.from(groups.entries()).map(([groupId, entries]) => ({
      groupId,
      entries: entries.sort((a, b) => {
        const idA = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
        const idB = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
        return idA - idB;
      }),
    }));
  }, [jobs]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    if (!sortField) {
      // Default sort: newest first (by createdAt descending)
      return [...groupedJobs].sort((a, b) => {
        const dateA = parseDateValue(a.entries[0]?.createdAt || "");
        const dateB = parseDateValue(b.entries[0]?.createdAt || "");
        return dateB - dateA; // Descending (newest first)
      });
    }
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...groupedJobs].sort((a, b) => {
      const getValue = (group: { entries: JobEntry[] }) => {
        const first = group.entries[0];
        if (!first) return "";
        if (sortField === "createdAt") return parseDateValue(first.createdAt);
        if (sortField === "createdBy") return first.createdBy.toLowerCase();
        if (sortField === "totalHrs") {
          return group.entries.reduce((sum, entry) => sum + entry.totalHrs, 0);
        }
        if (sortField === "totalAmount") {
          return group.entries.reduce((sum, entry) => sum + entry.totalAmount, 0);
        }
        const rawValue = first[sortField];
        if (rawValue === null || rawValue === undefined) {
          return "";
        }
        if (typeof rawValue === "string") {
          return rawValue.toString().toLowerCase();
        }
        return rawValue;
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [groupedJobs, sortField, sortDirection]);

  // Create table data
  const tableData = useMemo<TableRow[]>(() => {
    return sortedGroups
      .map((group) => {
        const [parent] = group.entries;
        if (!parent) return null;
        return {
          groupId: group.groupId,
          parent,
          groupTotalHrs: group.entries.reduce(
            (sum, entry) => sum + (entry.totalHrs || 0),
            0
          ),
          groupTotalAmount: group.entries.reduce(
            (sum, entry) => sum + (entry.totalAmount || 0),
            0
          ),
          entries: group.entries,
        };
      })
      .filter((row): row is TableRow => row !== null);
  }, [sortedGroups]);

  // Create expandable rows configuration
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
              onEdit={undefined}
              onImage={(groupId: number, cutId?: number) => handleImageInput(groupId, cutId)}
              onAssignChange={handleAssignChange}
              operatorUsers={operatorUsers}
              isOperator={true}
            />
          ),
          ariaLabel: expandedGroups.has(row.groupId)
            ? "Collapse cuts"
            : "Expand cuts",
        });
      }
    });
    return map;
  }, [tableData, expandedGroups, toggleGroup, handleImageInput, handleAssignChange, operatorUsers]);

  return {
    tableData,
    expandableRows,
  };
};
