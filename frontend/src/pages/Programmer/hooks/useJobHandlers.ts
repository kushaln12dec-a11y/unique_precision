import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getUserDisplayNameFromToken } from "../../../utils/auth";
import { formatDateLabel } from "../../../utils/date";
import { createJobs, updateJobsByGroupId, deleteJobsByGroupId } from "../../../services/jobApi";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "../programmerUtils";
import type { JobEntry } from "../../../types/job";

type UseJobHandlersProps = {
  cuts: CutForm[];
  editingGroupId: number | null;
  refNumber: string;
  jobs: JobEntry[];
  setJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingGroupId: React.Dispatch<React.SetStateAction<number | null>>;
  setCuts: React.Dispatch<React.SetStateAction<CutForm[]>>;
  setToast: React.Dispatch<
    React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
  >;
  totals: Array<{ totalHrs: number; totalAmount: number }>;
};

export const useJobHandlers = ({
  cuts,
  editingGroupId,
  refNumber,
  jobs,
  setJobs,
  setShowForm,
  setEditingGroupId,
  setCuts,
  setToast,
  totals,
}: UseJobHandlersProps) => {
  const navigate = useNavigate();

  const handleSaveJob = useCallback(async () => {
    try {
      const displayName = getUserDisplayNameFromToken();
      const createdBy = displayName || "Unknown User";
      const createdAt = formatDateLabel(new Date());
      const groupId = editingGroupId || Date.now();

      const entries: JobEntry[] = cuts.map((cut, index) => {
        const cutTotals = totals[index] ?? calculateTotals(cut);
        const normalizedCutImage = Array.isArray(cut.cutImage)
          ? (cut.cutImage[0] || "")
          : ((cut as any).cutImage || "");
        return {
          ...cut,
          cutImage: normalizedCutImage as any,
          refNumber: refNumber || String(groupId) || cut.refNumber || "",
          id: groupId + index,
          groupId,
          totalHrs: cutTotals.totalHrs,
          totalAmount: cutTotals.totalAmount,
          createdAt,
          createdBy,
          assignedTo: editingGroupId
            ? jobs.find((job) => job.groupId === editingGroupId)?.assignedTo || "Unassigned"
            : "Unassigned",
        };
      });

      if (editingGroupId) {
        const updatedJobs = await updateJobsByGroupId(editingGroupId, entries);
        setJobs((prev) => [
          ...updatedJobs,
          ...prev.filter((job) => job.groupId !== editingGroupId),
        ]);
        setToast({ message: "Job updated successfully!", variant: "success", visible: true });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
        setShowForm(false);
        setEditingGroupId(null);
        setCuts([DEFAULT_CUT]);
        navigate("/programmer");
      } else {
        const createdJobs = await createJobs(entries);
        setJobs((prev) => [...createdJobs, ...prev]);
        setToast({ message: "Job created successfully!", variant: "success", visible: true });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
        setShowForm(false);
        setEditingGroupId(null);
        setCuts([DEFAULT_CUT]);
        navigate("/programmer");
      }
    } catch (error) {
      console.error("Failed to save job", error);
      const message =
        error instanceof Error && error.message
          ? `Failed to save job: ${error.message}`
          : "Failed to save job. Please try again.";
      setToast({ message, variant: "error", visible: true });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
    }
  }, [
    cuts,
    editingGroupId,
    refNumber,
    jobs,
    totals,
    setJobs,
    setShowForm,
    setEditingGroupId,
    setCuts,
    setToast,
    navigate,
  ]);

  const handleDeleteJob = useCallback(
    async (groupId: number) => {
      try {
        await deleteJobsByGroupId(groupId);
        setJobs((prev) => prev.filter((job) => job.groupId !== groupId));
        setToast({ message: "Job deleted successfully!", variant: "success", visible: true });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
      } catch (error) {
        console.error("Failed to delete job", error);
        setToast({
          message: "Failed to delete job. Please try again.",
          variant: "error",
          visible: true,
        });
        setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
        throw error;
      }
    },
    [setJobs, setToast]
  );

  const handleMassDelete = useCallback(
    async (selectedJobIds: Set<number>) => {
      if (selectedJobIds.size === 0) return;

      try {
        const deletePromises = Array.from(selectedJobIds).map((groupId) =>
          deleteJobsByGroupId(groupId)
        );
        await Promise.all(deletePromises);

        setJobs((prev) => prev.filter((job) => !selectedJobIds.has(job.groupId)));
        setToast({
          message: `${selectedJobIds.size} job(s) deleted successfully!`,
          variant: "success",
          visible: true,
        });
        setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
      } catch (error) {
        console.error("Failed to delete jobs", error);
        setToast({
          message: "Failed to delete jobs. Please try again.",
          variant: "error",
          visible: true,
        });
        setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
      }
    },
    [setJobs, setToast]
  );

  const handleEditJob = useCallback(
    (groupId: number) => {
      navigate(`/programmer/edit/${groupId}`);
    },
    [navigate]
  );

  return {
    handleSaveJob,
    handleDeleteJob,
    handleMassDelete,
    handleEditJob,
  };
};
