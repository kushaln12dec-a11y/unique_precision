import type { CutForm } from "../pages/Programmer/programmerUtils";

export type OperatorCaptureEntry = {
  captureMode: "SINGLE" | "RANGE";
  fromQty: number;
  toQty: number;
  quantityCount: number;
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string;
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  createdAt: string;
  createdBy: string;
};

export type QuantityQaStatus = "SAVED" | "READY_FOR_QA" | "SENT_TO_QA";

export type JobEntry = CutForm & {
  id: number | string;
  groupId: number;
  totalHrs: number;
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
  operatorCaptures?: OperatorCaptureEntry[];
  quantityQaStates?: Record<string, QuantityQaStatus>;
};
