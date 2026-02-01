import type { JobEntry } from "../../../types/job";

export type PriorityLevel = "High" | "Medium" | "Low" | null;

/**
 * Priority hierarchy: High > Medium > Low
 * Returns the highest priority from a list of entries
 */
export const getHighestPriority = (entries: JobEntry[]): PriorityLevel => {
  if (entries.length === 0) return null;
  
  const priorities = entries
    .map((entry) => entry.priority as PriorityLevel)
    .filter((p): p is "High" | "Medium" | "Low" => p !== null && p !== undefined);
  
  if (priorities.length === 0) return null;
  
  if (priorities.includes("High")) return "High";
  if (priorities.includes("Medium")) return "Medium";
  if (priorities.includes("Low")) return "Low";
  
  return null;
};

/**
 * Check if any entry in a group is critical
 */
export const hasCriticalEntry = (entries: JobEntry[]): boolean => {
  return entries.some((entry) => entry.critical === true);
};

/**
 * Get row class names based on priority and critical status
 * Priority hierarchy: Critical > High > Medium > Low
 */
export const getRowClassName = (
  entries: JobEntry[],
  isExpanded: boolean = false,
  isChild: boolean = false
): string => {
  const classes = isChild ? ["child-row"] : ["group-row"];
  
  if (isExpanded && !isChild) {
    classes.push("group-row-expanded");
  }
  
  // Critical takes priority over priority levels
  if (hasCriticalEntry(entries)) {
    classes.push(isChild ? "child-critical-row" : "critical-row");
  } else {
    const priority = getHighestPriority(entries);
    if (priority) {
      const priorityClass = priority.toLowerCase();
      classes.push(isChild ? `child-priority-row child-priority-${priorityClass}` : `priority-row priority-${priorityClass}`);
    }
  }
  
  return classes.join(" ");
};

/**
 * Get parent row class name based on child entries
 */
export const getParentRowClassName = (
  parentEntry: JobEntry,
  childEntries: JobEntry[],
  isExpanded: boolean = false
): string => {
  // If parent itself is critical, use that
  if (parentEntry.critical) {
    const classes = ["group-row"];
    if (isExpanded) classes.push("group-row-expanded");
    classes.push("critical-row");
    return classes.join(" ");
  }
  
  // Otherwise, determine priority from children
  const childPriority = getHighestPriority(childEntries);
  const parentPriority = parentEntry.priority as PriorityLevel;
  
  // Use the higher priority between parent and children
  let finalPriority: PriorityLevel = parentPriority;
  
  if (childPriority) {
    if (!parentPriority) {
      finalPriority = childPriority;
    } else {
      // Priority hierarchy: High > Medium > Low
      const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      if (priorityOrder[childPriority] > priorityOrder[parentPriority]) {
        finalPriority = childPriority;
      }
    }
  }
  
  const classes = ["group-row"];
  if (isExpanded) classes.push("group-row-expanded");
  
  if (finalPriority) {
    classes.push(`priority-row priority-${finalPriority.toLowerCase()}`);
  }
  
  return classes.join(" ");
};
