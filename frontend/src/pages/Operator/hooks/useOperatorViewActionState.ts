import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveOperatorRunLogs } from "../../../services/employeeLogsApi";
import type { JobEntry } from "../../../types/job";
import type { QuantityProgressStatus } from "../utils/qaProgress";
import { calculateTotals, type CutForm } from "../../Programmer/programmerUtils";
import { loadOperatorUsers, seedQaStatusesByCut, seedSavedQuantities } from "../utils/operatorViewActionUtils";
import { createDefaultToast, type ToastState } from "../utils/operatorViewToast";

type Params = {
  jobs: JobEntry[];
};

export const useOperatorViewActionState = ({ jobs }: Params) => {
  const [operatorUsers, setOperatorUsers] = useState<Array<{ id: string | number; name: string }>>([]);
  const [savedQuantities, setSavedQuantities] = useState<Map<number | string, Set<number>>>(new Map());
  const [savedRanges, setSavedRanges] = useState<Map<number | string, Set<string>>>(new Map());
  const [qaStatusesByCut, setQaStatusesByCut] = useState<Map<number | string, Record<number, QuantityProgressStatus>>>(new Map());
  const [activeOperatorLogIds, setActiveOperatorLogIds] = useState<Map<string, string>>(new Map());
  const [saveToast, setSaveToast] = useState<ToastState>(() => createDefaultToast("success"));
  const [actionToast, setActionToast] = useState<ToastState>(() => createDefaultToast("info"));
  const [pendingDispatch, setPendingDispatch] = useState<{ cutId: number | string; quantityNumbers: number[] } | null>(null);
  const [pendingReset, setPendingReset] = useState<{ cutId: number | string; quantityIndex: number } | null>(null);

  useEffect(() => {
    void loadOperatorUsers().then(setOperatorUsers).catch((error) => console.error("Failed to fetch operators", error));
  }, []);

  useEffect(() => {
    if (!jobs.length) return;
    setQaStatusesByCut((prev) => {
      const next = new Map(prev);
      seedQaStatusesByCut(jobs).forEach((mapped, jobId) => {
        if (!next.has(jobId)) next.set(jobId, mapped);
      });
      return next;
    });
  }, [jobs]);

  useEffect(() => {
    if (!jobs.length) {
      setSavedQuantities(new Map());
      return;
    }
    const seeded = seedSavedQuantities(jobs);
    setSavedQuantities((prev) => {
      const merged = new Map(prev);
      seeded.forEach((set, cutId) => {
        const existing = merged.get(cutId) || new Set<number>();
        set.forEach((idx) => existing.add(idx));
        merged.set(cutId, existing);
      });
      return merged;
    });
  }, [jobs]);

  useEffect(() => {
    if (!jobs.length) {
      setActiveOperatorLogIds(new Map());
      return;
    }

    let isMounted = true;

    const syncActiveOperatorLogs = async () => {
      try {
        const activeLogs = await getActiveOperatorRunLogs();
        if (!isMounted) return;

        const currentJobIds = new Set(jobs.map((job) => String(job.id)));
        const nextMap = new Map<string, string>();

        activeLogs.forEach((log) => {
          if (log.endedAt) return;

          const jobId = String(log.jobId || "").trim();
          if (!jobId || !currentJobIds.has(jobId)) return;

          const fromQty = Math.max(1, Number(log.quantityFrom || 1));
          const toQty = Math.max(fromQty, Number(log.quantityTo || fromQty));
          for (let quantityNumber = fromQty; quantityNumber <= toQty; quantityNumber += 1) {
            nextMap.set(`${jobId}:${quantityNumber - 1}`, log._id);
          }
        });

        setActiveOperatorLogIds(nextMap);
      } catch {
        if (isMounted) {
          setActiveOperatorLogIds(new Map());
        }
      }
    };

    void syncActiveOperatorLogs();

    return () => {
      isMounted = false;
    };
  }, [jobs]);

  const resolveActiveOperatorLogId = useCallback(async (cutId: number | string, quantityIndex: number) => {
    const key = `${String(cutId)}:${quantityIndex}`;
    const existingLogId = activeOperatorLogIds.get(key);
    if (existingLogId) return existingLogId;

    const activeLogs = await getActiveOperatorRunLogs();
    const matchingLog = activeLogs.find((log) => {
      if (log.endedAt) return false;
      if (String(log.jobId || "").trim() !== String(cutId)) return false;
      const fromQty = Math.max(1, Number(log.quantityFrom || 1));
      const toQty = Math.max(fromQty, Number(log.quantityTo || fromQty));
      const quantityNumber = quantityIndex + 1;
      return quantityNumber >= fromQty && quantityNumber <= toQty;
    });

    if (!matchingLog?._id) return undefined;

    setActiveOperatorLogIds((prev) => {
      const next = new Map(prev);
      next.set(key, matchingLog._id);
      return next;
    });

    return matchingLog._id;
  }, [activeOperatorLogIds]);

  const amounts = useMemo(() => {
    if (jobs.length === 0) return { perCut: [], totalWedmAmount: 0, totalSedmAmount: 0, totalHrs: 0 };
    const totals = jobs.map((entry) => calculateTotals(entry as CutForm));
    return {
      perCut: totals.map((t) => ({ wedmAmount: t.wedmAmount, sedmAmount: t.sedmAmount, totalHrs: t.totalHrs })),
      totalWedmAmount: totals.reduce((sum, t) => sum + t.wedmAmount, 0),
      totalSedmAmount: totals.reduce((sum, t) => sum + t.sedmAmount, 0),
      totalHrs: totals.reduce((sum, t) => sum + t.totalHrs, 0),
    };
  }, [jobs]);

  return {
    operatorUsers,
    savedQuantities,
    setSavedQuantities,
    savedRanges,
    setSavedRanges,
    qaStatusesByCut,
    setQaStatusesByCut,
    activeOperatorLogIds,
    setActiveOperatorLogIds,
    resolveActiveOperatorLogId,
    saveToast,
    setSaveToast,
    actionToast,
    setActionToast,
    pendingDispatch,
    setPendingDispatch,
    pendingReset,
    setPendingReset,
    amounts,
  };
};
