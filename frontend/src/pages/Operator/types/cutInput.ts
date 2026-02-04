/**
 * Type definitions for operator cut input data
 */

export type CutInputData = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string;
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  lastImageFile: File | null;
};

export const createEmptyCutInputData = (): CutInputData => ({
  startTime: "",
  endTime: "",
  machineHrs: "",
  machineNumber: "",
  opsName: "",
  idleTime: "",
  idleTimeDuration: "",
  lastImage: null,
  lastImageFile: null,
});
