import type { QuantityInputData } from "./cutInput";

export type OperatorInputField =
  | keyof QuantityInputData
  | "recalculateMachineHrs"
  | "addIdleTimeToMachineHrs"
  | "togglePause"
  | "resetTimer"
  | "pauseReason";
