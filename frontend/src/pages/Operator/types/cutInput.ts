/**
 * Type definitions for operator cut input data
 */

export type QuantityInputData = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string[]; // Changed to array for multiple operators
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  lastImageFile: File | null;
};

export type CutInputData = {
  quantities: QuantityInputData[]; // Array of inputs, one per quantity unit
};

export const createEmptyQuantityInputData = (): QuantityInputData => ({
  startTime: "",
  endTime: "",
  machineHrs: "",
  machineNumber: "",
  opsName: [],
  idleTime: "",
  idleTimeDuration: "",
  lastImage: null,
  lastImageFile: null,
});

export const createEmptyCutInputData = (quantity: number = 1): CutInputData => ({
  quantities: Array.from({ length: quantity }, () => createEmptyQuantityInputData()),
});
