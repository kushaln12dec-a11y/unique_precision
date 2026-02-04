import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getJobs } from "../../../services/jobApi";
import type { JobEntry } from "../../../types/job";
import type { FilterValues } from "../../../components/FilterModal";
import { DEFAULT_CUT, type CutForm } from "../programmerUtils";

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
  const [showForm, setShowForm] = useState(false);
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [refNumber, setRefNumber] = useState<string>("");

  const isNewJobRoute = location.pathname === "/programmer/newjob";
  const isEditRoute = location.pathname.startsWith("/programmer/edit/");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getJobs(
          filters, 
          customerFilter, 
          createdByFilter, 
          undefined,
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
                  groupId: job.groupId ?? job.id,
                }))
              );
            }
          } catch (parseError) {
            console.error("Failed to parse jobs from storage", parseError);
          }
        }
      }
    };
    fetchJobs();
  }, [filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter]);

  useEffect(() => {
    if (isEditRoute && params.groupId) {
      const groupId = Number(params.groupId);
      if (!isNaN(groupId) && groupId !== editingGroupId) {
        const groupCuts = jobs
          .filter((job) => job.groupId === groupId)
          .sort((a, b) => {
            const idA = typeof a.id === 'number' ? a.id : Number(a.id) || 0;
            const idB = typeof b.id === 'number' ? b.id : Number(b.id) || 0;
            return idA - idB;
          });
        if (groupCuts.length > 0) {
          setEditingGroupId(groupId);
          setCuts(
            groupCuts.map((job) => ({
              customer: job.customer,
              rate: job.rate,
              cut: job.cut,
              thickness: job.thickness,
              passLevel: job.passLevel,
              setting: job.setting,
              qty: job.qty,
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
              material: (job as any).material ?? "",
              priority: job.priority,
              description: job.description,
              cutImage: job.cutImage ?? null,
              critical: job.critical,
              pipFinish: job.pipFinish,
              refNumber: (job as any).refNumber || "",
            }))
          );
          const firstJob = groupCuts[0];
          if (firstJob && (firstJob as any).refNumber) {
            setRefNumber((firstJob as any).refNumber);
          } else {
            setRefNumber(String(groupId));
          }
          setShowForm(true);
        }
      }
    } else if (isNewJobRoute) {
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length === 0 || (cuts.length === 1 && !cuts[0].customer)) {
        setCuts([DEFAULT_CUT]);
      }
      setShowForm(true);
    } else {
      setShowForm(false);
      if (editingGroupId !== null) {
        setEditingGroupId(null);
      }
      if (cuts.length > 0 && cuts[0]?.customer) {
        setCuts([DEFAULT_CUT]);
      }
    }
  }, [location.pathname, isEditRoute, params.groupId, jobs, editingGroupId, isNewJobRoute]);

  const handleNewJob = () => {
    setEditingGroupId(null);
    setCuts([DEFAULT_CUT]);
    const newGroupId = Date.now();
    setRefNumber(String(newGroupId));
  };

  const handleCancel = () => {
    setCuts([DEFAULT_CUT]);
    setEditingGroupId(null);
    setRefNumber("");
  };

  return {
    jobs,
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
    handleNewJob,
    handleCancel,
  };
};
