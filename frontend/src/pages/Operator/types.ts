import type { JobEntry } from "../../types/job";

export type OperatorTableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

export type OperatorCompletionAlert = {
  alertId: string;
  groupId: string;
  cutId?: string;
  machineNumber: string;
  jobRef: string;
  customer: string;
  description: string;
  quantityLabel: string;
  operatorName?: string;
  estimatedTime: string;
  remainingLabel: string;
  statusLabel: string;
  severity: "warning" | "danger";
};
