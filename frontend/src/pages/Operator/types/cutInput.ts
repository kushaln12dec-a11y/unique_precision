/**
 * Type definitions for operator cut input data
 */

export type PauseSession = {
  pauseStartTime: number; // Timestamp when paused
  pauseEndTime: number | null; // Timestamp when resumed (null if currently paused)
  pauseDuration: number; // Duration in seconds
  reason: string; // Reason for pause
  operatorName?: string; // User who kept the job idle
};

export type OperatorHistoryDetail = {
  name: string;
  durationSeconds: number;
  revenue?: number;
};

export type QuantityInputData = {
  startTime: string;
  startTimeEpochMs: number | null;
  endTime: string;
  endTimeEpochMs: number | null;
  machineHrs: string;
  machineNumber: string;
  opsName: string[];
  operatorHistory: string[];
  operatorHistoryDetails?: OperatorHistoryDetail[];
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  lastImageFile: File | null;
  isPaused: boolean; // Pause state
  pauseStartTime: number | null; // Timestamp when paused (current pause session)
  totalPauseTime: number; // Total accumulated pause time in seconds
  pausedElapsedTime: number; // Elapsed time when paused
  pauseSessions: PauseSession[]; // Array of all pause sessions with reasons
  currentPauseReason: string; // Current pause reason (for active pause)
};

export type CutInputData = {
  quantities: QuantityInputData[]; // Array of inputs, one per quantity unit
};

export const createEmptyQuantityInputData = (): QuantityInputData => ({
  startTime: "",
  startTimeEpochMs: null,
  endTime: "",
  endTimeEpochMs: null,
  machineHrs: "",
  machineNumber: "",
  opsName: [],
  operatorHistory: [],
  operatorHistoryDetails: [],
  idleTime: "",
  idleTimeDuration: "",
  lastImage: null,
  lastImageFile: null,
  isPaused: false,
  pauseStartTime: null,
  totalPauseTime: 0,
  pausedElapsedTime: 0,
  pauseSessions: [],
  currentPauseReason: "",
});

export const createEmptyCutInputData = (quantity: number = 1): CutInputData => ({
  quantities: Array.from({ length: quantity }, () => createEmptyQuantityInputData()),
});
