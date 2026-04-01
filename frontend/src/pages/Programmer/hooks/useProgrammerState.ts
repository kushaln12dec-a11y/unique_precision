import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getJobsByGroupId, getProgrammerJobs } from "../../../services/jobApi";
import type { JobEntry } from "../../../types/job";
import type { FilterValues } from "../../../components/FilterModal";
import { DEFAULT_CUT, sortGroupEntriesParentFirst, type CutForm } from "../programmerUtils";
import { removeParentMirrorEntries, toEditableCutForm } from "../utils/programmerStateUtils";

const STORAGE_KEY = "programmerJobs";

const hasCutDraftData = (cut: CutForm) => {
  if (!cut) return false;
  const valuesToCheck: Array<unknown> = [
    cut.customer,
    cut.rate,
    cut.cut,
    cut.thickness,
    cut.passLevel,
    cut.setting,
    cut.qty,
    cut.material,
    cut.description,
    cut.remark,
    cut.programRefFile,
    cut.operationRowsJson,
    cut.sedmLengthValue,
    cut.manualTotalHrs,
  ];
  return valuesToCheck.some((value) => String(value ?? "").trim() !== "");
};
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
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState<string>("");
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const loadedEditGroupRef = useRef<string | null>(null);
  const loadedCloneGroupRef = useRef<string | null>(null);

  const isNewJobRoute = location.pathname.startsWith("/programmer/newjob");
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
                assignedTo: job.assignedTo || "Unassign",
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
        setEditGroupError(null);
        setLoadingEditGroup(false);
        return;
      }

      setEditGroupError(null);
      let mounted = true;

      const loadEditGroup = async () => {
        if (!groupId) return;
        try {
          setLoadingEditGroup(true);
          const groupCuts = removeParentMirrorEntries(
            sortGroupEntriesParentFirst(await getJobsByGroupId(groupId))
          );
          if (!mounted) return;

          if (groupCuts.length === 0) {
            loadedEditGroupRef.current = null;
            setEditingGroupId(null);
            setRefNumber("");
            setCuts([DEFAULT_CUT]);
            setEditGroupError("No job entries were found for this edit request.");
            return;
          }

          loadedEditGroupRef.current = groupId;
          setEditingGroupId(groupId);
          setCuts(groupCuts.map((job) => toEditableCutForm(job, false)));
          const firstJob = groupCuts[0];
          setRefNumber((firstJob as any)?.refNumber ? String((firstJob as any).refNumber) : String(groupId));
        } catch (error) {
          console.error("Failed to fetch edit group", error);
          if (mounted) {
            loadedEditGroupRef.current = null;
            setEditingGroupId(null);
            setRefNumber("");
            setCuts([DEFAULT_CUT]);
            setEditGroupError(
              error instanceof Error && error.message
                ? error.message
                : "Failed to load job details for editing."
            );
          }
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
      setEditGroupError(null);
      const cloneGroupId = isCloneRoute ? String(params.groupId || "").trim() : "";

      if (cloneGroupId) {
        if (loadedCloneGroupRef.current === cloneGroupId) {
          setLoadingEditGroup(false);
          setEditingGroupId(null);
          setRefNumber("");
          return;
        }

        let mounted = true;

        const loadCloneDraft = async () => {
          try {
            setLoadingEditGroup(true);
            const groupCuts = removeParentMirrorEntries(
              sortGroupEntriesParentFirst(await getJobsByGroupId(cloneGroupId))
            );
            if (!mounted) return;

            if (groupCuts.length === 0) {
              loadedCloneGroupRef.current = null;
              setCuts([DEFAULT_CUT]);
              setEditingGroupId(null);
              setRefNumber("");
              return;
            }

            loadedCloneGroupRef.current = cloneGroupId;
            setEditingGroupId(null);
            setRefNumber("");
            setCuts(groupCuts.map((job) => toEditableCutForm(job, true)));
          } catch (error) {
            console.error("Failed to fetch clone group", error);
            if (mounted) {
              loadedCloneGroupRef.current = null;
              setCuts([DEFAULT_CUT]);
              setEditingGroupId(null);
              setRefNumber("");
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
      if (cuts.length === 0 || (cuts.length === 1 && !hasCutDraftData(cuts[0]))) {
        setCuts([DEFAULT_CUT]);
      }
      if (refNumber) setRefNumber("");
    } else {
      loadedEditGroupRef.current = null;
      loadedCloneGroupRef.current = null;
      setEditGroupError(null);
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length !== 1 || hasCutDraftData(cuts[0])) {
        setCuts([DEFAULT_CUT]);
      }
    }
  }, [location.pathname, isEditRoute, isCloneRoute, params.groupId, isNewJobRoute]);

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
    cuts,
    setCuts,
    editingGroupId,
    setEditingGroupId,
    refNumber,
    setRefNumber,
    editGroupError,
    isNewJobRoute,
    isEditRoute,
    isCloneRoute,
    handleNewJob,
    handleCancel,
  };
};
