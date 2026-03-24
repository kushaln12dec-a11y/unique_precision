import type { CutInputData } from "../types/cutInput";

const getStorageKey = (groupId: string | null): string => `operator_inputs_shared_${groupId || "default"}`;

export const saveOperatorInputsToLocalStorage = (
  groupId: string | null,
  cutInputs: Map<number | string, CutInputData>
) => {
  try {
    const dataToSave: Record<string, CutInputData> = {};
    cutInputs.forEach((value, key) => {
      dataToSave[String(key)] = {
        quantities: value.quantities.map((qty) => ({
          ...qty,
          lastImageFile: null,
        })),
      };
    });
    localStorage.setItem(getStorageKey(groupId), JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save to localStorage", error);
  }
};

export const loadOperatorInputsFromLocalStorage = (
  groupId: string | null
): Map<number | string, CutInputData> | null => {
  try {
    const savedData = localStorage.getItem(getStorageKey(groupId));
    if (!savedData) return null;

    const parsedData = JSON.parse(savedData) as Record<string, CutInputData>;
    const map = new Map<number | string, CutInputData>();
    Object.entries(parsedData).forEach(([key, value]) => {
      map.set(key, {
        quantities: value.quantities.map((qty) => ({
          ...qty,
          pauseSessions: qty.pauseSessions || [],
          currentPauseReason: qty.currentPauseReason || "",
          isPaused: qty.isPaused || false,
          pauseStartTime: qty.pauseStartTime || null,
          totalPauseTime: qty.totalPauseTime || 0,
          pausedElapsedTime: qty.pausedElapsedTime || 0,
          lastImageFile: null,
        })),
      });
    });
    return map;
  } catch (error) {
    console.error("Failed to load from localStorage", error);
    return null;
  }
};
