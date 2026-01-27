import type { CutForm } from "../pages/Programmer/programmerUtils";

export type JobEntry = CutForm & {
  id: number | string;
  groupId: number;
  totalHrs: number;
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
};
