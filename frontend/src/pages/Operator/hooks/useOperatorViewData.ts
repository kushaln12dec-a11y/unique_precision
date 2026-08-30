import { useCallback, useEffect, useRef, useState } from "react";
import { getOperatorJobsByGroupId } from "../../../services/operatorApi";
import { getIdleTimeConfigs } from "../../../services/idleTimeConfigApi";
import { getEmployeeLogs } from "../../../services/employeeLogsApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";
import { parseDurationToSeconds } from "../utils/operatorTimeUtils";
import { loadOperatorInputsFromLocalStorage, saveOperatorInputsToLocalStorage } from "../utils/operatorViewStorage";
import { toMachineIndex } from "../../../utils/jobFormatting";
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
  const getMachineNumberArray = (value: unknown) =>
    String(value || "")
      .split(",")
      .map((machine) => toMachineIndex(machine.trim()))
      .filter(Boolean);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [idleTimeConfigs, setIdleTimeConfigs] = useState<Map<string, number>>(new Map());
  const [idleTimeConfigsLoaded, setIdleTimeConfigsLoaded] = useState(false);
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());
  const hasLoadedInitialDataRef = useRef(false);
  const loadGenerationRef = useRef(0);

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
    const loadGeneration = ++loadGenerationRef.current;
    try {
      if (!hasLoadedInitialDataRef.current) {
        setLoadingJobs(true);
      }
      const fetchedJobs = await getOperatorJobsByGroupId(groupId);
      if (loadGeneration !== loadGenerationRef.current) return;
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
        const isMultiQuantityJob = quantity > 1;

        const quantities: QuantityInputData[] = Array.from({ length: quantity }, () => createEmptyQuantityInputData());
        const captures = Array.isArray(existing.operatorCaptures) ? existing.operatorCaptures : [];
        const tableMachineNumbers = getMachineNumberArray(existing.machineNumber || "");
        const captureFallbackOpsNameArray: string[] = []; // leave per-quantity opsName empty when not in capture
        const captureFallbackMachineNumber = isMultiQuantityJob ? "" : (tableMachineNumbers[0] || "");

        if (captures.length > 0) {
          captures.forEach((capture: any) => {
            const fromQty = Math.max(1, Number(capture.fromQty || 1));
            const toQty = Math.min(quantity, Math.max(fromQty, Number(capture.toQty || fromQty)));
            const captureOps = getOpsNameArray(capture.opsName || "");
            const opsNameArray = captureOps.length > 0 ? captureOps : captureFallbackOpsNameArray;
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
                opsName: [...opsNameArray],
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

          for (let idx = 0; idx < quantity; idx += 1) {
            if ((quantities[idx]?.opsName || []).length > 0) continue;
            quantities[idx] = {
              ...quantities[idx],
              machineNumber: captureFallbackMachineNumber,
              opsName: [...captureFallbackOpsNameArray],
            };
          }
        } else {
          const opsName = existing.opsName || "";
          const baseOps = getOpsNameArray(opsName);
          const opsNameArray = assignedToArray.length > 0 ? assignedToArray : baseOps;
          const startTime = isMultiQuantityJob ? "" : (existing.startTime || "");
          const endTime = isMultiQuantityJob ? "" : (existing.endTime || "");
          let idleTime = isMultiQuantityJob ? "" : (existing.idleTime || "");
          let idleTimeDuration = isMultiQuantityJob ? "" : (existing.idleTimeDuration || "");

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
            machineNumber: tableMachineNumbers[0] || "",
            opsName: isMultiQuantityJob ? [] : [...opsNameArray],
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

          // Additional quantities start empty; operator will assign per-quantity
          for (let idx = 1; idx < quantity; idx += 1) {
            quantities[idx] = {
              ...quantities[idx],
              machineNumber: tableMachineNumbers[idx] || "",
              opsName: [],
            };
          }
        }

        initialInputs.set(jobId, {
          quantities: quantities.map((qty, index) =>
            hydrateQuantityFromLogs(qty, index + 1, job, logsByJobId.get(String(jobId)) || [])
          ),
        });
      });

      const storedInputs = loadOperatorInputsFromLocalStorage(groupId);

      setJobs(filteredJobs);
      setCutInputs((prev) => {
        if (initialInputs.size === 0) return mergeJobAssignmentsIntoInputs(prev, filteredJobs);

        const next = new Map(initialInputs);
        const mergeDraftInputs = (draftInputs: Map<number | string, CutInputData> | null) => {
          if (!draftInputs) return;
          draftInputs.forEach((prevCut, cutId) => {
            const nextCut = next.get(cutId);
            if (nextCut && nextCut.quantities) {
              const mergedQuantities = nextCut.quantities.map((qty, i) => {
                const prevQty = prevCut.quantities[i];
                if (!prevQty) return qty;

                const isLocked = Boolean(String(qty.endTime || "").trim());
                if (isLocked) return qty;

                const hasStartTime = Boolean(String(qty.startTime || "").trim());

                return {
                  ...qty,
                  // Server-authoritative per-qty assignment wins; use prev only when server data is empty
                  machineNumber: qty.machineNumber || prevQty.machineNumber,
                  opsName: qty.opsName?.length > 0 ? qty.opsName : (prevQty.opsName || []),
                  startTime: hasStartTime ? qty.startTime : prevQty.startTime,
                  startTimeEpochMs: hasStartTime ? qty.startTimeEpochMs : prevQty.startTimeEpochMs,
                  endTime: String(qty.endTime || "").trim() ? qty.endTime : prevQty.endTime,
                  endTimeEpochMs: qty.endTimeEpochMs || prevQty.endTimeEpochMs,
                  idleTime: prevQty.idleTime || qty.idleTime,
                  idleTimeDuration: prevQty.idleTimeDuration || qty.idleTimeDuration,
                  lastImage: prevQty.lastImage || qty.lastImage,
                  lastImageFile: prevQty.lastImageFile || qty.lastImageFile,
                  pauseSessions:
                    Array.isArray(prevQty.pauseSessions) && prevQty.pauseSessions.length > 0
                      ? prevQty.pauseSessions
                      : qty.pauseSessions,
                  isPaused: hasStartTime ? qty.isPaused : prevQty.isPaused,
                  pauseStartTime: hasStartTime ? qty.pauseStartTime : prevQty.pauseStartTime,
                  currentPauseReason: prevQty.currentPauseReason || qty.currentPauseReason,
                  currentPauseOperatorName: prevQty.currentPauseOperatorName || qty.currentPauseOperatorName,
                  totalPauseTime: prevQty.totalPauseTime || qty.totalPauseTime,
                  pausedElapsedTime: prevQty.pausedElapsedTime || qty.pausedElapsedTime,
                  machineHrs: String(qty.machineHrs || "").trim() ? qty.machineHrs : prevQty.machineHrs,
                };
              });
              next.set(cutId, { ...nextCut, quantities: mergedQuantities });
            }
          });
        };

        mergeDraftInputs(storedInputs);
        mergeDraftInputs(prev);

        return mergeJobAssignmentsIntoInputs(next, filteredJobs);
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
    setJobs,
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
