/**
 * Shared table configuration for Programmer and Operator pages
 */

export const PRIORITY_ORDER = {
  High: 3,
  Medium: 2,
  Low: 1,
} as const;

export const PRIORITY_COLORS = {
  High: {
    background: "#fee2e2",
    border: "#ef4444",
    hover: "#fecaca",
    text: "#991b1b",
  },
  Medium: {
    background: "#fef3c7",
    border: "#f59e0b",
    hover: "#fde68a",
    text: "#0f172a",
  },
  Low: {
    background: "#d1fae5",
    border: "#10b981",
    hover: "#a7f3d0",
    text: "#0f172a",
  },
  Critical: {
    background: "#fee2e2",
    border: "#dc2626",
    hover: "#fecaca",
    text: "#0f172a",
  },
} as const;
