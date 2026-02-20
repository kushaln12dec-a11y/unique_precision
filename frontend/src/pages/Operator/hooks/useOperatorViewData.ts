import { useEffect, useState } from "react";
import { getOperatorJobsByGroupId } from "../../../services/operatorApi";
import { getIdleTimeConfigs } from "../../../services/idleTimeConfigApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";

/**
 * Hook for fetching and managing operator view data
 */
// Helper functions for localStorage persistence
const getStorageKey = (groupId: string | null): string => {
  return `operator_inputs_${groupId || 'default'}`;
};

const saveToLocalStorage = (groupId: string | null, cutInputs: Map<number | string, CutInputData>) => {
  try {
    const storageKey = getStorageKey(groupId);
    // Convert Map to plain object for storage
    const dataToSave: Record<string, CutInputData> = {};
    cutInputs.forEach((value, key) => {
      // Convert to plain object, excluding File objects (can't be serialized)
      const serializableData: CutInputData = {
        quantities: value.quantities.map((qty) => ({
          ...qty,
          lastImageFile: null, // Don't persist File objects
        })),
      };
      dataToSave[String(key)] = serializableData;
    });
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save to localStorage", error);
  }
};

const loadFromLocalStorage = (groupId: string | null): Map<number | string, CutInputData> | null => {
  try {
    const storageKey = getStorageKey(groupId);
    const savedData = localStorage.getItem(storageKey);
    if (!savedData) return null;
    
    const parsedData = JSON.parse(savedData) as Record<string, CutInputData>;
    const map = new Map<number | string, CutInputData>();
    
    Object.entries(parsedData).forEach(([key, value]) => {
      // Ensure all required fields are present with defaults
      const normalizedData: CutInputData = {
        quantities: value.quantities.map((qty) => ({
          ...qty,
          pauseSessions: qty.pauseSessions || [],
          currentPauseReason: qty.currentPauseReason || "",
          isPaused: qty.isPaused || false,
          pauseStartTime: qty.pauseStartTime || null,
          totalPauseTime: qty.totalPauseTime || 0,
          pausedElapsedTime: qty.pausedElapsedTime || 0,
          lastImageFile: null, // File objects can't be restored
        })),
      };
      map.set(key, normalizedData);
    });
    
    return map;
  } catch (error) {
    console.error("Failed to load from localStorage", error);
    return null;
  }
};

export const useOperatorViewData = (groupId: string | null, cutIdParam: string | null) => {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [idleTimeConfigs, setIdleTimeConfigs] = useState<Map<string, number>>(new Map());
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());

  // Fetch idle time configs
  useEffect(() => {
    const fetchIdleTimeConfigs = async () => {
      try {
        const configs = await getIdleTimeConfigs();
        const configMap = new Map<string, number>();
        configs.forEach((config) => {
          configMap.set(config.idleTimeType, config.durationMinutes);
        });
        setIdleTimeConfigs(configMap);
      } catch (error) {
        console.error("Failed to fetch idle time configs", error);
        // Set default for Vertical Dial if fetch fails
        const defaultMap = new Map<string, number>();
        defaultMap.set("Vertical Dial", 20);
        setIdleTimeConfigs(defaultMap);
      }
    };
    fetchIdleTimeConfigs();
  }, []);

  // Fetch jobs and initialize inputs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!groupId) return;
      try {
        const fetchedJobs = await getOperatorJobsByGroupId(Number(groupId));
        
        // Filter to specific cut if cutId is provided
        let filteredJobs = fetchedJobs;
        if (cutIdParam) {
          filteredJobs = fetchedJobs.filter((job) => String(job.id) === String(cutIdParam));
        }
        
        // Try to load from localStorage first
        const savedInputs = loadFromLocalStorage(groupId);
        
        // Initialize inputs for all cuts
        const initialInputs = new Map<number, CutInputData>();
        filteredJobs.forEach((job) => {
          const jobId = job.id as number;
          
          // If we have saved data for this cut, use it
          if (savedInputs && savedInputs.has(jobId)) {
            initialInputs.set(jobId, savedInputs.get(jobId)!);
            return;
          }
          
          // Otherwise, initialize from job data
          const existing = job as any;
          const quantity = Math.max(1, Number(job.qty || 1));

          // Handle backward compatibility: if opsName is a string, convert to array
          const getOpsNameArray = (rawOpsName: string | string[]) => {
            if (Array.isArray(rawOpsName)) return rawOpsName;
            return rawOpsName && rawOpsName !== "Unassigned" ? rawOpsName.split(", ").filter(Boolean) : [];
          };

          const quantities: QuantityInputData[] = Array.from({ length: quantity }, () => createEmptyQuantityInputData());
          const captures = Array.isArray(existing.operatorCaptures) ? existing.operatorCaptures : [];

          if (captures.length > 0) {
            captures.forEach((capture: any) => {
              const fromQty = Math.max(1, Number(capture.fromQty || 1));
              const toQty = Math.min(quantity, Math.max(fromQty, Number(capture.toQty || fromQty)));
              const opsNameArray = getOpsNameArray(capture.opsName || "");
              const startTime = capture.startTime || "";
              const endTime = capture.endTime || "";
              let idleTime = capture.idleTime || "";
              let idleTimeDuration = capture.idleTimeDuration || "";

              if (idleTime === "Vertical Dial") {
                if (idleTimeConfigs.has("Vertical Dial")) {
                  const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
                  const hours = Math.floor(durationMinutes / 60);
                  const minutes = durationMinutes % 60;
                  idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                } else {
                  idleTimeDuration = "00:20";
                }
              }

              let machineHrs = capture.machineHrs || "";
              if (startTime && endTime) {
                machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
              } else {
                machineHrs = "0.000";
              }

              for (let idx = fromQty - 1; idx <= toQty - 1; idx += 1) {
                quantities[idx] = {
                  startTime,
                  startTimeEpochMs: null,
                  endTime,
                  endTimeEpochMs: null,
                  machineHrs,
                  machineNumber: capture.machineNumber || "",
                  opsName: opsNameArray,
                  idleTime,
                  idleTimeDuration,
                  lastImage: capture.lastImage || null,
                  lastImageFile: null,
                  isPaused: false,
                  pauseStartTime: null,
                  totalPauseTime: 0,
                  pausedElapsedTime: 0,
                  pauseSessions: [],
                  currentPauseReason: "",
                };
              }
            });
          } else {
            const opsName = existing.opsName || "";
            const opsNameArray = getOpsNameArray(opsName);
            const startTime = existing.startTime || "";
            const endTime = existing.endTime || "";
            let idleTime = existing.idleTime || "";
            let idleTimeDuration = existing.idleTimeDuration || "";

            if (idleTime === "Vertical Dial") {
              if (idleTimeConfigs.has("Vertical Dial")) {
                const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
              } else {
                idleTimeDuration = "00:20";
              }
            }

            let machineHrs = existing.machineHrs || "";
            if (startTime && endTime) {
              machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
            } else {
              machineHrs = "0.000";
            }

            quantities[0] = {
              startTime,
              startTimeEpochMs: null,
              endTime,
              endTimeEpochMs: null,
              machineHrs,
              machineNumber: existing.machineNumber || "",
              opsName: opsNameArray,
              idleTime,
              idleTimeDuration,
              lastImage: existing.lastImage || null,
              lastImageFile: null,
              isPaused: false,
              pauseStartTime: null,
              totalPauseTime: 0,
              pausedElapsedTime: 0,
              pauseSessions: [],
              currentPauseReason: "",
            };
          }
          
          initialInputs.set(jobId, {
            quantities,
          });
        });
        
        setCutInputs(initialInputs);
        setJobs(filteredJobs);
        // Expand first cut by default
        if (filteredJobs.length > 0) {
          setExpandedCuts(new Set([filteredJobs[0].id]));
        }
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      }
    };
    fetchJobs();
  }, [groupId, cutIdParam, idleTimeConfigs]);
  
  // Save to localStorage whenever cutInputs changes
  useEffect(() => {
    if (groupId && cutInputs.size > 0) {
      saveToLocalStorage(groupId, cutInputs);
    }
  }, [cutInputs, groupId]);

  const toggleCutExpansion = (cutId: number | string) => {
    setExpandedCuts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cutId)) {
        newSet.delete(cutId);
      } else {
        newSet.add(cutId);
      }
      return newSet;
    });
  };

  return {
    jobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    setExpandedCuts,
    toggleCutExpansion,
  };
};
