import { useEffect, useState } from "react";
import { getOperatorJobsByGroupId } from "../../../services/operatorApi";
import { getIdleTimeConfigs } from "../../../services/idleTimeConfigApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyCutInputData, createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";

/**
 * Hook for fetching and managing operator view data
 */
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
        
        // Initialize inputs for all cuts
        const initialInputs = new Map<number, CutInputData>();
        filteredJobs.forEach((job) => {
          const existing = job as any;
          const quantity = Math.max(1, Number(job.qty || 1));
          
          // Handle backward compatibility: if opsName is a string, convert to array
          const opsName = existing.opsName || "";
          const opsNameArray = Array.isArray(opsName) 
            ? opsName 
            : (opsName && opsName !== "Unassigned" ? opsName.split(", ").filter(Boolean) : []);
          
          // Create quantity inputs - for backward compatibility, use existing data for first quantity
          const quantities: QuantityInputData[] = Array.from({ length: quantity }, (_, index) => {
            if (index === 0) {
              // First quantity uses existing data
              const startTime = existing.startTime || "";
              const endTime = existing.endTime || "";
              let idleTime = existing.idleTime || "";
              let idleTimeDuration = existing.idleTimeDuration || "";
              
              // If Vertical Dial is selected, ensure idleTimeDuration is in "00:20" format
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
              
              // Recalculate machineHrs if startTime and endTime exist
              let machineHrs = existing.machineHrs || "";
              if (startTime && endTime) {
                machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
              } else {
                machineHrs = "0.000";
              }
              
              return {
                startTime,
                endTime,
                machineHrs,
                machineNumber: existing.machineNumber || "",
                opsName: opsNameArray,
                idleTime,
                idleTimeDuration,
                lastImage: existing.lastImage || null,
                lastImageFile: null,
              };
            } else {
              // Other quantities start empty
              return createEmptyQuantityInputData();
            }
          });
          
          initialInputs.set(job.id as number, {
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
