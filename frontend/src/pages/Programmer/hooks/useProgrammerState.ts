import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getJobsByGroupId, getProgrammerJobs } from "../../../services/jobApi";
import type { JobEntry } from "../../../types/job";
import type { FilterValues } from "../../../components/FilterModal";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "../programmerUtils";

const STORAGE_KEY = "programmerJobs";
/**
 * Hook for managing programmer page state
 */
export const useProgrammerState = (
  filters: FilterValues,
  customerFilter: string,
  descriptionFilter: string,
  createdByFilter: string,
  criticalFilter: boolean
) => {
  const location = useLocation();
  const params = useParams<{ groupId?: string }>();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingEditGroup, setLoadingEditGroup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState<string>("");
  const loadedEditGroupRef = useRef<string | null>(null);
  const loadedCloneGroupRef = useRef<string | null>(null);

  const isNewJobRoute = location.pathname === "/programmer/newjob";
  const isEditRoute = location.pathname.startsWith("/programmer/edit/");
  const isCloneRoute = location.pathname.startsWith("/programmer/clone/");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoadingJobs(true);
        const fetchedJobs = await getProgrammerJobs(
          filters, 
          customerFilter, 
          createdByFilter, 
          criticalFilter ? true : undefined,
          descriptionFilter
        );
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as JobEntry[];
            if (Array.isArray(parsed)) {
              let filtered = parsed;
              if (criticalFilter) {
                filtered = parsed.filter((job) => job.critical === true);
              }
            setJobs(
              filtered.map((job) => ({
                ...job,
                assignedTo: job.assignedTo || "Unassigned",
                groupId: String(job.groupId ?? job.id),
              }))
            );
            }
          } catch (parseError) {
            console.error("Failed to parse jobs from storage", parseError);
          }
        }
      }
      finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, [filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter]);

  useEffect(() => {
    if (isEditRoute && params.groupId) {
      const groupId = String(params.groupId);
      if (loadedEditGroupRef.current === groupId) {
        setShowForm(true);
        return;
      }

      loadedEditGroupRef.current = groupId;
      let mounted = true;

      const loadEditGroup = async () => {
        if (!groupId) return;
        try {
          setLoadingEditGroup(true);
          const groupCuts = (await getJobsByGroupId(groupId)).sort((a, b) => {
            const idA = typeof a.id === "number" ? a.id : Number(a.id) || 0;
            const idB = typeof b.id === "number" ? b.id : Number(b.id) || 0;
            return idA - idB;
          });
          if (!mounted || groupCuts.length === 0) return;

          setEditingGroupId(groupId);
          setCuts(
            groupCuts.map((job) => {
              const baseCut: CutForm = {
                customer: String(job.customer ?? ""),
                rate: String(job.rate ?? ""),
                cut: String(job.cut ?? ""),
                thickness: String(job.thickness ?? ""),
                passLevel: String(job.passLevel ?? ""),
                setting: String(job.setting ?? ""),
                qty: String(job.qty ?? ""),
                sedm: job.sedm,
                sedmSelectionType: job.sedmSelectionType ?? "range",
                sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
                sedmStandardValue: job.sedmStandardValue ?? "",
                sedmLengthType: job.sedmLengthType ?? "min",
                sedmOver20Length: job.sedmOver20Length ?? "",
                sedmLengthValue:
                  job.sedmLengthValue ??
                  (job.sedmSelectionType === "range"
                    ? job.sedmRangeKey ?? ""
                    : job.sedmStandardValue ?? ""),
                sedmHoles: job.sedmHoles ?? "1",
                sedmEntriesJson: (job as any).sedmEntriesJson ?? "",
                operationRowsJson: (job as any).operationRowsJson ?? "",
                material: (job as any).material ?? "",
                priority: job.priority,
                description: job.description,
                programRefFile: String((job as any).programRefFile ?? (job as any).programRefFileName ?? ""),
                cutImage: Array.isArray(job.cutImage)
                  ? job.cutImage
                  : (job.cutImage ? [job.cutImage as unknown as string] : []),
                critical: job.critical,
                pipFinish: job.pipFinish,
                refNumber: (job as any).refNumber || "",
                manualTotalHrs: "",
              };

              const derivedTotalHrs = calculateTotals(baseCut).totalHrs;
              const savedTotalHrs = Number(job.totalHrs || 0);
              const shouldKeepManualOverride =
                Number.isFinite(savedTotalHrs) && Math.abs(savedTotalHrs - derivedTotalHrs) > 0.01;

              return {
                ...baseCut,
                manualTotalHrs: shouldKeepManualOverride ? String(savedTotalHrs) : "",
              };
            })
          );
          const firstJob = groupCuts[0];
          setRefNumber((firstJob as any)?.refNumber ? String((firstJob as any).refNumber) : String(groupId));
          setShowForm(true);
        } catch (error) {
          console.error("Failed to fetch edit group", error);
        } finally {
          if (mounted) setLoadingEditGroup(false);
        }
      };

      void loadEditGroup();
      return () => {
        mounted = false;
      };
    } else if (isNewJobRoute || isCloneRoute) {
      loadedEditGroupRef.current = null;
      const cloneGroupId = isCloneRoute ? String(params.groupId || "").trim() : "";

      if (cloneGroupId) {
        if (loadedCloneGroupRef.current === cloneGroupId) {
          setEditingGroupId(null);
          setRefNumber("");
          setShowForm(true);
          return;
        }

        loadedCloneGroupRef.current = cloneGroupId;
        let mounted = true;

        const loadCloneDraft = async () => {
          try {
            setLoadingEditGroup(true);
            const groupCuts = (await getJobsByGroupId(cloneGroupId)).sort((a, b) => {
              const idA = typeof a.id === "number" ? a.id : Number(a.id) || 0;
              const idB = typeof b.id === "number" ? b.id : Number(b.id) || 0;
              return idA - idB;
            });
            if (!mounted) return;

            if (groupCuts.length === 0) {
              setCuts([DEFAULT_CUT]);
              setEditingGroupId(null);
              setRefNumber("");
              setShowForm(true);
              return;
            }

            setEditingGroupId(null);
            setRefNumber("");
            setCuts(
              groupCuts.map((job) => ({
                customer: String(job.customer ?? ""),
                rate: String(job.rate ?? ""),
                cut: String(job.cut ?? ""),
                thickness: String(job.thickness ?? ""),
                passLevel: String(job.passLevel ?? ""),
                setting: String(job.setting ?? ""),
                qty: String(job.qty ?? ""),
                sedm: job.sedm,
                sedmSelectionType: job.sedmSelectionType ?? "range",
                sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
                sedmStandardValue: job.sedmStandardValue ?? "",
                sedmLengthType: job.sedmLengthType ?? "min",
                sedmOver20Length: job.sedmOver20Length ?? "",
                sedmLengthValue:
                  job.sedmLengthValue ??
                  (job.sedmSelectionType === "range"
                    ? job.sedmRangeKey ?? ""
                    : job.sedmStandardValue ?? ""),
                sedmHoles: job.sedmHoles ?? "1",
                sedmEntriesJson: (job as any).sedmEntriesJson ?? "",
                operationRowsJson: (job as any).operationRowsJson ?? "",
                material: (job as any).material ?? "",
                priority: job.priority,
                description: job.description,
                programRefFile: String((job as any).programRefFile ?? (job as any).programRefFileName ?? ""),
                cutImage: Array.isArray(job.cutImage)
                  ? job.cutImage
                  : (job.cutImage ? [job.cutImage as unknown as string] : []),
                critical: Boolean(job.critical),
                pipFinish: Boolean(job.pipFinish),
                refNumber: "",
                manualTotalHrs: String(job.totalHrs ?? "").trim(),
              }))
            );
            setShowForm(true);
          } catch (error) {
            console.error("Failed to fetch clone group", error);
            if (mounted) {
              setCuts([DEFAULT_CUT]);
              setEditingGroupId(null);
              setRefNumber("");
              setShowForm(true);
            }
          } finally {
            if (mounted) setLoadingEditGroup(false);
          }
        };

        void loadCloneDraft();
        return () => {
          mounted = false;
        };
      }

      loadedCloneGroupRef.current = null;
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length === 0 || (cuts.length === 1 && !cuts[0].customer)) {
        setCuts([DEFAULT_CUT]);
      }
      if (refNumber) setRefNumber("");
      setShowForm(true);
    } else {
      loadedEditGroupRef.current = null;
      loadedCloneGroupRef.current = null;
      setShowForm(false);
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length > 0 && cuts[0]?.customer) {
        setCuts([DEFAULT_CUT]);
      }
    }
  }, [location.pathname, isEditRoute, isCloneRoute, params.groupId, isNewJobRoute, jobs, refNumber]);

  const handleNewJob = () => {
    loadedCloneGroupRef.current = null;
    setEditingGroupId(null);
    setCuts([DEFAULT_CUT]);
    setRefNumber("");
  };

  const handleCancel = () => {
    loadedCloneGroupRef.current = null;
    setCuts([DEFAULT_CUT]);
    setEditingGroupId(null);
    setRefNumber("");
  };

  return {
    jobs,
    loadingJobs,
    loadingEditGroup,
    setJobs,
    showForm,
    setShowForm,
    cuts,
    setCuts,
    editingGroupId,
    setEditingGroupId,
    refNumber,
    setRefNumber,
    isNewJobRoute,
    isEditRoute,
    isCloneRoute,
    handleNewJob,
    handleCancel,
  };
};
