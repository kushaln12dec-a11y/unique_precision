import { useCallback, useEffect, useState } from "react";
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
  const [idleTimeConfigsLoaded, setIdleTimeConfigsLoaded] = useState(false);
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());

  const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

  const parseAssignedOperators = (rawAssignedTo: unknown): string[] => {
    if (Array.isArray(rawAssignedTo)) {
      return [...new Set(rawAssignedTo.map((value) => normalizeOperatorName(value)).filter(Boolean))];
    }
    const normalized = String(rawAssignedTo || "").trim();
    const normalizedLower = normalized.toLowerCase();
    if (!normalized || normalizedLower === "unassigned" || normalizedLower === "unassign") return [];
    return [...new Set(normalized.split(",").map((value) => normalizeOperatorName(value)).filter(Boolean))];
  };

  const mergeJobAssignmentsIntoInputs = (
    previousInputs: Map<number | string, CutInputData>,
    nextJobs: JobEntry[]
  ) => {
    const nextInputs = new Map(previousInputs);

    nextJobs.forEach((job) => {
      const currentCut = nextInputs.get(job.id);
      if (!currentCut?.quantities?.length) return;

      const assignedOperators = parseAssignedOperators((job as any).assignedTo || "");
      const sharedMachine = String((job as any).machineNumber || "").trim();
      const mergedQuantities = currentCut.quantities.map((qty) => {
        const hasLockedCapture = Boolean(String(qty.endTime || "").trim());
        if (hasLockedCapture) return qty;

        return {
          ...qty,
          machineNumber: sharedMachine || String(qty.machineNumber || "").trim(),
          opsName: assignedOperators,
        };
      });

      nextInputs.set(job.id, {
        ...currentCut,
        quantities: mergedQuantities,
      });
    });

    return nextInputs;
  };

  const collectOperatorHistoryForQuantity = (
    quantityNumber: number,
    logsForJob: Array<{
      quantityFrom?: number | null;
      quantityTo?: number | null;
      userName?: string | null;
      metadata?: Record<string, any> | null;
      startedAt?: string | null;
      endedAt?: string | null;
      durationSeconds?: number | null;
    }>
  ): string[] => {
    const seen = new Set<string>();
    const collected: string[] = [];
    const pushName = (rawValue: unknown) => {
      String(rawValue || "")
        .split(",")
        .map((value) => normalizeOperatorName(value))
        .filter(Boolean)
        .forEach((value) => {
          const key = value.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          collected.push(value);
        });
    };

    logsForJob.forEach((log) => {
      const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
      if (logDuration <= 0) return;
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      if (quantityNumber < fromQty || quantityNumber > toQty) return;
      pushName(log?.userName);
    });
    return collected;
  };

  const getDurationSeconds = (entry: {
    startTime?: string | null;
    endTime?: string | null;
    machineHrs?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationSeconds?: number | null;
  }) => {
    const machineHours = Number(entry.machineHrs || 0);
    if (Number.isFinite(machineHours) && machineHours > 0) {
      return Math.max(0, Math.round(machineHours * 3600));
    }

    const directDuration = Number(entry.durationSeconds || 0);
    if (Number.isFinite(directDuration) && directDuration > 0) {
      return Math.max(0, Math.round(directDuration));
    }

    const startValue = String(entry.startTime || entry.startedAt || "").trim();
    const endValue = String(entry.endTime || entry.endedAt || "").trim();
    if (!startValue || !endValue) return 0;

    const startDate = Number.isNaN(new Date(startValue).getTime()) ? null : new Date(startValue);
    const endDate = Number.isNaN(new Date(endValue).getTime()) ? null : new Date(endValue);
    if (startDate && endDate) {
      return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
    }
    return 0;
  };

  const collectOperatorHistoryDetailsForQuantity = (
    quantityNumber: number,
    logsForJob: Array<{
      quantityFrom?: number | null;
      quantityTo?: number | null;
      userName?: string | null;
      metadata?: Record<string, any> | null;
      startedAt?: string | null;
      endedAt?: string | null;
      durationSeconds?: number | null;
    }>
  ) => {
    const summary = new Map<string, { durationSeconds: number; revenue: number }>();
    const addEntry = (rawName: unknown, durationSeconds: number, revenue = 0) => {
      const name = normalizeOperatorName(rawName);
      if (!name) return;
      const existing = summary.get(name) || { durationSeconds: 0, revenue: 0 };
      summary.set(name, {
        durationSeconds: existing.durationSeconds + Math.max(0, durationSeconds),
        revenue: existing.revenue + Math.max(0, revenue),
      });
    };

    logsForJob.forEach((log) => {
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      if (quantityNumber < fromQty || quantityNumber > toQty) return;
      const rangeCount = Math.max(1, toQty - fromQty + 1);
      const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
      if (logDuration <= 0) return;
      const revenueByQuantity = (((log.metadata as any)?.revenueByQuantity || {}) as Record<string, number>) || {};
      const quantityRevenue = Number(revenueByQuantity[String(quantityNumber)] || 0);
      const fallbackRevenue = Number((log.metadata as any)?.revenue || 0);
      const perQuantityRevenue = quantityRevenue > 0 ? quantityRevenue : (fallbackRevenue > 0 ? fallbackRevenue / rangeCount : 0);
      addEntry(log?.userName, logDuration / rangeCount, perQuantityRevenue);
    });

    return Array.from(summary.entries())
      .map(([name, detail]) => ({
      name,
      durationSeconds: Math.max(0, Math.round(detail.durationSeconds)),
      revenue: Math.max(0, Number(detail.revenue.toFixed(2))),
    }))
      .filter((entry) => entry.durationSeconds > 0)
      .sort((left, right) => right.durationSeconds - left.durationSeconds);
  };

  const getWorkedDurationSecondsForQuantity = (
    quantityNumber: number,
    logsForJob: Array<{
      quantityFrom?: number | null;
      quantityTo?: number | null;
      userName?: string | null;
      metadata?: Record<string, any> | null;
      startedAt?: string | null;
      endedAt?: string | null;
      durationSeconds?: number | null;
      status?: string | null;
    }>
  ) =>
    logsForJob.reduce((sum, log) => {
      const status = String(log.status || "").toUpperCase();
      if (status !== "COMPLETED" && status !== "REJECTED") return sum;
      const fromQty = Math.max(1, Number(log?.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log?.quantityTo || fromQty));
      if (quantityNumber < fromQty || quantityNumber > toQty) return sum;
      const rangeCount = Math.max(1, toQty - fromQty + 1);
      const logDuration = Number((log.metadata as any)?.workedSeconds || 0) || getDurationSeconds(log);
      if (logDuration <= 0) return sum;
      return sum + logDuration / rangeCount;
    }, 0);

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
      setLoadingJobs(true);
      const fetchedJobs = await getOperatorJobsByGroupId(groupId);
        const operatorLogs = await getEmployeeLogs({ role: "OPERATOR", limit: 500 }).catch(() => []);
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
        
        // Try to load from localStorage first
        const savedInputs = loadOperatorInputsFromLocalStorage(groupId);
        
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
                  ? qty.opsName.map((value) => normalizeOperatorName(value)).filter(Boolean)
                  : [];
                return {
                    ...qty,
                    machineNumber: String(qty.machineNumber || "").trim() || sharedMachine,
                    opsName: qtyOps.length > 0 ? qtyOps : assignedToArray,
                    workedDurationSeconds:
                      Number(qty.workedDurationSeconds || 0) ||
                      Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(index + 1, logsByJobId.get(String(jobId)) || []))),
                    operatorHistory: Array.isArray(qty.operatorHistory)
                      ? qty.operatorHistory.map((value) => normalizeOperatorName(value)).filter(Boolean)
                      : collectOperatorHistoryForQuantity(index + 1, logsByJobId.get(String(jobId)) || []),
                    operatorHistoryDetails: collectOperatorHistoryDetailsForQuantity(index + 1, logsByJobId.get(String(jobId)) || []),
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
                  workedDurationSeconds: Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(idx + 1, logsByJobId.get(String(jobId)) || []))),
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
              workedDurationSeconds: Math.max(0, Math.round(getWorkedDurationSecondsForQuantity(1, logsByJobId.get(String(jobId)) || []))),
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
        
      setJobs(filteredJobs);
      setCutInputs((prev) => {
        const preferredInputs = initialInputs.size > 0 ? initialInputs : prev;
        return mergeJobAssignmentsIntoInputs(preferredInputs, filteredJobs);
      });
      if (filteredJobs.length > 0) {
        setExpandedCuts((prev) => (prev.size > 0 ? prev : new Set([filteredJobs[0].id])));
      }
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
        const fetchedJobs = await getOperatorJobsByGroupId(groupId);
        const filteredJobs = cutIdParam
          ? fetchedJobs.filter((job) => String(job.id) === String(cutIdParam))
          : fetchedJobs;
        setJobs(filteredJobs);
        setCutInputs((prev) => mergeJobAssignmentsIntoInputs(prev, filteredJobs));
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
