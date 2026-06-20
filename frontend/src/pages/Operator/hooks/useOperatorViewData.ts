import { useCallback, useEffect, useRef, useState } from "react";
import { getOperatorJobsByGroupId } from "../../../services/operatorApi";
import { getIdleTimeConfigs } from "../../../services/idleTimeConfigApi";
import { getEmployeeLogs, invalidateEmployeeLogsCache } from "../../../services/employeeLogsApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";
import { parseDurationToSeconds } from "../utils/operatorTimeUtils";
import { saveOperatorInputsToLocalStorage } from "../utils/operatorViewStorage";
import {
  collectOperatorHistoryDetailsForQuantity,
  collectOperatorHistoryForQuantity,
  getWorkedDurationSecondsForQuantity,
  hydrateQuantityFromLogs,
  mergeJobAssignmentsIntoInputs,
  parseAssignedOperators,
} from "../utils/operatorViewDataHelpers";

export const useOperatorViewData = (groupId: string | null, cutIdParam: string | null) => {
  const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [idleTimeConfigs, setIdleTimeConfigs] = useState<Map<string, number>>(new Map());
  const [idleTimeConfigsLoaded, setIdleTimeConfigsLoaded] = useState(false);
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());
  const hasLoadedInitialDataRef = useRef(false);

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
      } finally {
        setIdleTimeConfigsLoaded(true);
      }
    };
    fetchIdleTimeConfigs();
  }, []);

  // Fetch jobs and initialize inputs
  const loadOperatorViewData = useCallback(async () => {
    if (!idleTimeConfigsLoaded) return;
    if (!groupId) {
      setLoadingJobs(false);
      return;
    }
    try {
      if (!hasLoadedInitialDataRef.current) {
        setLoadingJobs(true);
      }
      invalidateEmployeeLogsCache(/employee-logs/);
      const fetchedJobs = await getOperatorJobsByGroupId(groupId);
        const operatorLogs = await getEmployeeLogs({
          role: "OPERATOR",
          jobGroupId: groupId,
          limit: 2000,
        }).catch(() => []);
        const logsByJobId = new Map<string, Array<{
          quantityFrom?: number | null;
          quantityTo?: number | null;
          userName?: string | null;
          metadata?: Record<string, any> | null;
          startedAt?: string | null;
          endedAt?: string | null;
          durationSeconds?: number | null;
          status?: string | null;
        }>>();
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
        
        // Initialize inputs for all cuts
        const initialInputs = new Map<number | string, CutInputData>();
        filteredJobs.forEach((job) => {
          const jobId = job.id;
          const existing = job as any;
          const getOpsNameArray = (rawOpsName: string | string[]) => {
            if (Array.isArray(rawOpsName)) return rawOpsName.map((value) => normalizeOperatorName(value)).filter(Boolean);
            return rawOpsName && rawOpsName !== "Unassigned" && rawOpsName !== "Unassign"
              ? rawOpsName.split(",").map((value) => normalizeOperatorName(value)).filter(Boolean)
              : [];
          };
          const assignedToArray = parseAssignedOperators(existing.assignedTo || "");
          
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

              let machineHrs = String(capture.machineHrs || "").trim();
              if (!machineHrs && startTime && endTime) {
                machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
              } else if (!machineHrs) {
                machineHrs = "0.000";
              }

              for (let idx = fromQty - 1; idx <= toQty - 1; idx += 1) {
                const persistedPauseSeconds = parseDurationToSeconds(idleTimeDuration);
                quantities[idx] = {
                  startTime,
                  startTimeEpochMs: null,
                  endTime,
                  endTimeEpochMs: null,
                  workedDurationSeconds: Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(idx + 1, logsByJobId.get(String(jobId)) || []))),
                  pauseTimeOffsetSeconds: 0,
                  machineHrs,
                  machineNumber: capture.machineNumber || "",
                  opsName: opsNameArray,
                  operatorHistory: collectOperatorHistoryForQuantity(idx + 1, logsByJobId.get(String(jobId)) || []),
                  operatorHistoryDetails: collectOperatorHistoryDetailsForQuantity(idx + 1, logsByJobId.get(String(jobId)) || []),
                  idleTime,
                  idleTimeDuration,
                  lastImage: capture.lastImage || null,
                  lastImageFile: null,
                  isPaused: false,
                  pauseStartTime: null,
                  currentPauseOperatorName: "",
                  totalPauseTime: persistedPauseSeconds,
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

            let machineHrs = String(existing.machineHrs || "").trim();
            if (!machineHrs && startTime && endTime) {
              machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
            } else if (!machineHrs) {
              machineHrs = "0.000";
            }

            quantities[0] = {
              startTime,
              startTimeEpochMs: null,
              endTime,
              endTimeEpochMs: null,
              workedDurationSeconds: Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(1, logsByJobId.get(String(jobId)) || []))),
              pauseTimeOffsetSeconds: 0,
              machineHrs,
              machineNumber: existing.machineNumber || "",
              opsName: opsNameArray,
              operatorHistory: collectOperatorHistoryForQuantity(1, logsByJobId.get(String(jobId)) || []),
              operatorHistoryDetails: collectOperatorHistoryDetailsForQuantity(1, logsByJobId.get(String(jobId)) || []),
              idleTime,
              idleTimeDuration,
              lastImage: existing.lastImage || null,
              lastImageFile: null,
              isPaused: false,
              pauseStartTime: null,
              currentPauseOperatorName: "",
              totalPauseTime: parseDurationToSeconds(idleTimeDuration),
              pausedElapsedTime: 0,
              pauseSessions: [],
              currentPauseReason: "",
            };
          }
          
          initialInputs.set(jobId, {
            quantities: quantities.map((qty, index) =>
              hydrateQuantityFromLogs(qty, index + 1, job, logsByJobId.get(String(jobId)) || [])
            ),
          });
        });
        
      setJobs(filteredJobs);
      setCutInputs((prev) => {
        const preferredInputs = initialInputs.size > 0 ? initialInputs : prev;
        return mergeJobAssignmentsIntoInputs(preferredInputs, filteredJobs);
      });
      if (filteredJobs.length > 0) {
        setExpandedCuts((prev) => (prev.size > 0 ? prev : new Set([filteredJobs[0].id])));
      }
      hasLoadedInitialDataRef.current = true;
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoadingJobs(false);
    }
  }, [cutIdParam, groupId, idleTimeConfigs, idleTimeConfigsLoaded]);

  useEffect(() => {
    void loadOperatorViewData();
  }, [loadOperatorViewData]);

  useEffect(() => {
    if (!groupId) return;

    const syncJobsOnly = async () => {
      try {
        invalidateEmployeeLogsCache(/employee-logs/);
        const [fetchedJobs, operatorLogs] = await Promise.all([
          getOperatorJobsByGroupId(groupId),
          getEmployeeLogs({ role: "OPERATOR", jobGroupId: groupId, limit: 2000 }).catch(() => [])
        ]);

        const logsByJobId = new Map<string, Array<any>>();
        operatorLogs.forEach((log) => {
          const jobId = String(log.jobId || "").trim();
          if (!jobId) return;
          if (!logsByJobId.has(jobId)) logsByJobId.set(jobId, []);
          logsByJobId.get(jobId)!.push(log);
        });

        const filteredJobs = cutIdParam
          ? fetchedJobs.filter((job) => String(job.id) === String(cutIdParam))
          : fetchedJobs;
          
        setJobs(filteredJobs);
        setCutInputs((prev) => {
          const next = new Map(prev);
          filteredJobs.forEach((job) => {
            const currentCut = next.get(job.id);
            if (!currentCut?.quantities?.length) return;
            const updatedQuantities = currentCut.quantities.map((qty, index) => 
              hydrateQuantityFromLogs(qty, index + 1, job, logsByJobId.get(String(job.id)) || [])
            );
            next.set(job.id, { ...currentCut, quantities: updatedQuantities });
          });
          return mergeJobAssignmentsIntoInputs(next, filteredJobs);
        });
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
    reloadOperatorViewData: loadOperatorViewData,
  };
};
