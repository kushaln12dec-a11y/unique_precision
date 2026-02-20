/**
 * Type definitions for operator cut input data
 */

export type PauseSession = {
  pauseStartTime: number; // Timestamp when paused
  pauseEndTime: number | null; // Timestamp when resumed (null if currently paused)
  pauseDuration: number; // Duration in seconds
  reason: string; // Reason for pause
};

export type QuantityInputData = {
  startTime: string;
  startTimeEpochMs: number | null;
  endTime: string;
  endTimeEpochMs: number | null;
  machineHrs: string;
  machineNumber: string;
  opsName: string[]; // Changed to array for multiple operators
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
