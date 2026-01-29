import { parseDateValue } from "../../../utils/date";
import type { JobEntry } from "../../../types/job";

export type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

export const groupJobs = (jobs: JobEntry[]): Array<{ groupId: number; entries: JobEntry[] }> => {
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
      const idA = typeof a.id === "number" ? a.id : Number(a.id) || 0;
      const idB = typeof b.id === "number" ? b.id : Number(b.id) || 0;
      return idA - idB;
    }),
  }));
};

export const sortGroups = (
  groupedJobs: Array<{ groupId: number; entries: JobEntry[] }>,
  sortField: keyof JobEntry | null,
  sortDirection: "asc" | "desc"
): Array<{ groupId: number; entries: JobEntry[] }> => {
  if (!sortField) {
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
};

export const transformToTableRows = (
  sortedGroups: Array<{ groupId: number; entries: JobEntry[] }>
): TableRow[] => {
  return sortedGroups
    .map((group) => {
      const [parent] = group.entries;
      if (!parent) return null;
      return {
        groupId: group.groupId,
        parent,
        groupTotalHrs: group.entries.reduce((sum, entry) => sum + (entry.totalHrs || 0), 0),
        groupTotalAmount: group.entries.reduce(
          (sum, entry) => sum + (entry.totalAmount || 0),
          0
        ),
        entries: group.entries,
      };
    })
    .filter((row): row is TableRow => row !== null);
};
