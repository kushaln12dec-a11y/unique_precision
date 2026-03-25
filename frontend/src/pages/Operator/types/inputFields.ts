import type { QuantityInputData } from "./cutInput";

export type OperatorInputField =
  | keyof QuantityInputData
  | "recalculateMachineHrs"
  | "addIdleTimeToMachineHrs"
  | "togglePause"
  | "markShiftOver"
  | "resetTimer"
  | "pauseReason";
