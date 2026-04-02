import { useEffect, useState } from "react";
import { getOperatorJobsByGroupId } from "../../../services/operatorApi";
import { getIdleTimeConfigs } from "../../../services/idleTimeConfigApi";
import { getEmployeeLogs } from "../../../services/employeeLogsApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";
import { loadOperatorInputsFromLocalStorage, saveOperatorInputsToLocalStorage } from "../utils/operatorViewStorage";

export const useOperatorViewData = (groupId: string | null, cutIdParam: string | null) => {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [idleTimeConfigs, setIdleTimeConfigs] = useState<Map<string, number>>(new Map());
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());

  const parseAssignedOperators = (rawAssignedTo: unknown): string[] => {
    if (Array.isArray(rawAssignedTo)) {
      return [...new Set(rawAssignedTo.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))].slice(0, 1);
    }
    const normalized = String(rawAssignedTo || "").trim();
    const normalizedLower = normalized.toLowerCase();
    if (!normalized || normalizedLower === "unassigned" || normalizedLower === "unassign") return [];
    return [...new Set(normalized.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))].slice(0, 1);
  };

  const collectOperatorHistoryForQuantity = (
    captures: any[],
    quantityNumber: number,
    assignedToArray: string[],
    logsForJob: Array<{ quantityFrom?: number | null; quantityTo?: number | null; userName?: string | null }>
  ): string[] => {
    const seen = new Set<string>();
    const collected: string[] = [];
    const pushName = (rawValue: unknown) => {
      String(rawValue || "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
        .forEach((value) => {
          const key = value.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          collected.push(value);
        });
    };

    captures.forEach((capture: any) => {
      const fromQty = Math.max(1, Number(capture?.fromQty || 1));
      const toQty = Math.max(fromQty, Number(capture?.toQty || fromQty));
      if (quantityNumber < fromQty || quantityNumber > toQty) return;
      pushName(capture?.opsName);
    });
    logsForJob.forEach((log) => {
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      if (quantityNumber < fromQty || quantityNumber > toQty) return;
      pushName(log?.userName);
    });
    assignedToArray.forEach((value) => pushName(value));
    return collected;
  };

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
      if (!groupId) {
        setLoadingJobs(false);
        return;
      }
      try {
        setLoadingJobs(true);
        const fetchedJobs = await getOperatorJobsByGroupId(groupId);
        const operatorLogs = await getEmployeeLogs({ role: "OPERATOR", limit: 500 }).catch(() => []);
        const logsByJobId = new Map<string, Array<{ quantityFrom?: number | null; quantityTo?: number | null; userName?: string | null }>>();
        operatorLogs.forEach((log) => {
          const jobId = String(log.jobId || "").trim();
          if (!jobId) return;
          if (!logsByJobId.has(jobId)) logsByJobId.set(jobId, []);
          logsByJobId.get(jobId)!.push(log);
        });
        
        // Filter to specific cut if cutId is provided
        let filteredJobs = fetchedJobs;
        if (cutIdParam) {
          filteredJobs = fetchedJobs.filter((job) => String(job.id) === String(cutIdParam));
        }
        
        // Try to load from localStorage first
        const savedInputs = loadOperatorInputsFromLocalStorage(groupId);
        
        // Initialize inputs for all cuts
        const initialInputs = new Map<number | string, CutInputData>();
        filteredJobs.forEach((job) => {
          const jobId = job.id;
          const existing = job as any;
          const getOpsNameArray = (rawOpsName: string | string[]) => {
            if (Array.isArray(rawOpsName)) return rawOpsName.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean).slice(0, 1);
            return rawOpsName && rawOpsName !== "Unassigned" && rawOpsName !== "Unassign"
              ? rawOpsName.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean).slice(0, 1)
              : [];
          };
          const assignedToArray = parseAssignedOperators(existing.assignedTo || "");
          
          // If we have saved data for this cut, use it
          if (savedInputs && savedInputs.has(jobId)) {
            const saved = savedInputs.get(jobId)!;
            const savedQuantities = Array.isArray(saved.quantities) ? saved.quantities : [];
            const requiredQuantity = Math.max(1, Number(job.qty || 1));
            const sharedMachine = String(existing.machineNumber || "").trim();
            initialInputs.set(jobId, {
              quantities: Array.from({ length: requiredQuantity }, (_, index) => {
                const qty = savedQuantities[index];
                if (!qty) {
                  return {
                    ...createEmptyQuantityInputData(),
                    machineNumber: sharedMachine,
                    opsName: assignedToArray,
                  };
                }
                const qtyOps = Array.isArray(qty.opsName)
                  ? qty.opsName.map((value) => String(value || "").trim()).filter(Boolean)
                  : [];
                return {
                    ...qty,
                    machineNumber: String(qty.machineNumber || "").trim() || sharedMachine,
                    opsName: qtyOps.length > 0 ? qtyOps : assignedToArray,
                    operatorHistory: Array.isArray(qty.operatorHistory)
                      ? qty.operatorHistory.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean)
                      : collectOperatorHistoryForQuantity(existing.operatorCaptures || [], index + 1, assignedToArray, logsByJobId.get(String(jobId)) || []),
                };
              }),
            });
            return;
          }
          
          // Otherwise, initialize from job data
          const quantity = Math.max(1, Number(job.qty || 1));

          const quantities: QuantityInputData[] = Array.from({ length: quantity }, () => createEmptyQuantityInputData());
          const captures = Array.isArray(existing.operatorCaptures) ? existing.operatorCaptures : [];

          if (captures.length > 0) {
            captures.forEach((capture: any) => {
              const fromQty = Math.max(1, Number(capture.fromQty || 1));
              const toQty = Math.min(quantity, Math.max(fromQty, Number(capture.toQty || fromQty)));
              const captureOps = getOpsNameArray(capture.opsName || "");
              const opsNameArray = captureOps.length > 0 ? captureOps : assignedToArray;
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
                  operatorHistory: collectOperatorHistoryForQuantity(captures, idx + 1, assignedToArray, logsByJobId.get(String(jobId)) || []),
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
            const baseOps = getOpsNameArray(opsName);
            const opsNameArray = baseOps.length > 0 ? baseOps : assignedToArray;
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
              operatorHistory: collectOperatorHistoryForQuantity(captures, 1, assignedToArray, logsByJobId.get(String(jobId)) || []),
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
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [groupId, cutIdParam, idleTimeConfigs]);

  useEffect(() => {
    if (!groupId) return;

    const syncJobsOnly = async () => {
      try {
        const fetchedJobs = await getOperatorJobsByGroupId(groupId);
        const filteredJobs = cutIdParam
          ? fetchedJobs.filter((job) => String(job.id) === String(cutIdParam))
          : fetchedJobs;
        setJobs(filteredJobs);
      } catch {
        // Background sync should not block operator flow.
      }
    };

    const intervalId = window.setInterval(() => {
      void syncJobsOnly();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [groupId, cutIdParam]);
  
  // Save to localStorage whenever cutInputs changes
  useEffect(() => {
    if (groupId && cutInputs.size > 0) {
      saveOperatorInputsToLocalStorage(groupId, cutInputs);
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
    loadingJobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    setExpandedCuts,
    toggleCutExpansion,
  };
};
