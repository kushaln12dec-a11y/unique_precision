import type { CutInputData } from "../types/cutInput";
import { getUserIdFromToken } from "../../../utils/auth";

const getStorageKey = (groupId: string | null, userId?: string | null): string => {
  const scope = groupId || "default";
  if (userId) return `operator_inputs_${userId}_${scope}`;
  return `operator_inputs_shared_${scope}`;
};

export const clearOperatorDraftsForUser = (userId?: string | null) => {
  const resolvedUserId = userId ?? getUserIdFromToken();
  const prefixes = resolvedUserId
    ? [`operator_inputs_${resolvedUserId}_`, "operator_inputs_shared_"]
    : ["operator_inputs_shared_"];

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (prefixes.some((prefix) => key.startsWith(prefix)) || key.startsWith("operator_inputs_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Failed to clear operator drafts", error);
  }
};

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
    localStorage.setItem(getStorageKey(groupId, getUserIdFromToken()), JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save to localStorage", error);
  }
};

export const loadOperatorInputsFromLocalStorage = (
  groupId: string | null
): Map<number | string, CutInputData> | null => {
  try {
    const userId = getUserIdFromToken();
    const userKey = getStorageKey(groupId, userId);
    const sharedKey = getStorageKey(groupId, null);
    const savedData = localStorage.getItem(userKey) || (!userId ? localStorage.getItem(sharedKey) : null) || localStorage.getItem(sharedKey);
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
          workedDurationSeconds: qty.workedDurationSeconds || 0,
          pauseTimeOffsetSeconds: (qty as any).pauseTimeOffsetSeconds || 0,
          operatorHistory: Array.isArray(qty.operatorHistory) ? qty.operatorHistory : Array.isArray(qty.opsName) ? qty.opsName : [],
          operatorHistoryDetails: Array.isArray((qty as any).operatorHistoryDetails) ? (qty as any).operatorHistoryDetails : [],
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
