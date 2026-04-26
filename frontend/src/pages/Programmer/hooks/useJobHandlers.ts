import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUserDisplayNameFromToken } from "../../../utils/auth";
import { createJobs, updateJobsByGroupId, deleteJobsByGroupId } from "../../../services/jobApi";
import { completeProgrammerJobLog } from "../../../services/employeeLogsApi";
import { calculateTotals, sortGroupEntriesParentFirst, type CalculationResult, type CutForm } from "../programmerUtils";
import { isValidCustomerUpcCode } from "../utils/validation";
import type { JobEntry } from "../../../types/job";

type UseJobHandlersProps = {
  cuts: CutForm[];
  editingGroupId: string | null;
  refNumber: string;
  jobs: JobEntry[];
  setJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setToast: React.Dispatch<
    React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
  >;
  setSavingJob: React.Dispatch<React.SetStateAction<boolean>>;
  handleCancelState: () => void;
  totals: CalculationResult[];
};

export const useJobHandlers = ({
  cuts,
  editingGroupId,
  refNumber,
  jobs,
  setJobs,
  setToast,
  setSavingJob,
  handleCancelState,
  totals,
}: UseJobHandlersProps) => {
  const navigate = useNavigate();
  const saveCancelledRef = useRef(false);

  const finishSaveAndReturnToProgrammerTable = useCallback((message: string) => {
    setSavingJob(false);
    handleCancelState();

    if (saveCancelledRef.current) {
      return;
    }

    navigate("/programmer", {
      replace: true,
      state: { refreshedAt: Date.now() },
    });

    setToast({ message, variant: "success", visible: true });
    window.setTimeout(() => setToast({ message: "", variant: "success", visible: false }), 3000);
  }, [handleCancelState, navigate, setSavingJob, setToast]);

  const cancelSave = useCallback(() => {
    saveCancelledRef.current = true;
  }, []);

  const handleSaveJob = useCallback(async () => {
    const invalidCustomerIndex = cuts.findIndex((cut) => !isValidCustomerUpcCode(cut.customer));
    if (invalidCustomerIndex >= 0) {
      setToast({
        message: `Setting ${invalidCustomerIndex + 1}: customer UPC number is required (e.g. UPC001).`,
        variant: "error",
        visible: true,
      });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
      return;
    }

    saveCancelledRef.current = false;
    setSavingJob(true);
    try {
      const displayName = getUserDisplayNameFromToken();
      const createdBy = displayName || "Unknown User";
      const groupId = editingGroupId || String(Date.now());
      const existingGroupJobs = editingGroupId
        ? sortGroupEntriesParentFirst(jobs.filter((job) => String(job.groupId) === String(editingGroupId)))
        : [];

      const entries: JobEntry[] = cuts.map((cut, index) => {
        const cutTotals = totals[index] ?? calculateTotals(cut);
        const normalizedCutImage = Array.isArray(cut.cutImage)
          ? (cut.cutImage[0] || "")
          : ((cut as any).cutImage || "");
        const existingJob = editingGroupId ? existingGroupJobs[index] : undefined;
        const baseEntry = {
          ...cut,
          cutImage: normalizedCutImage as any,
          refNumber: editingGroupId ? refNumber || cut.refNumber || "" : "",
          id: `${groupId}-${index}`,
          groupId,
          totalHrs: cutTotals.totalHrs,
          totalAmount: cutTotals.totalAmount,
          createdBy: String(existingJob?.createdBy || createdBy).trim() || createdBy,
          assignedTo: editingGroupId
            ? jobs.find((job) => String(job.groupId) === editingGroupId)?.assignedTo || "Unassign"
            : "Unassign",
          machineNumber: existingJob?.machineNumber || "",
          quantityQaStates: existingJob?.quantityQaStates ?? {},
          operatorCaptures: existingJob?.operatorCaptures ?? [],
        } as JobEntry;
        return baseEntry;
      });

      if (editingGroupId) {
        const updatedJobs = await updateJobsByGroupId(editingGroupId, entries);
        if (saveCancelledRef.current) {
          return;
        }
        setJobs((prev) => [
          ...updatedJobs,
          ...prev.filter((job) => String(job.groupId) !== editingGroupId),
        ]);
        finishSaveAndReturnToProgrammerTable("Job updated successfully!");
      } else {
        const createdJobs = await createJobs(entries);
        void completeProgrammerJobLog({
          jobGroupId: groupId,
          refNumber: createdJobs[0]?.refNumber || "",
          customer: createdJobs[0]?.customer || "",
          description: createdJobs[0]?.description || "",
          settingsCount: createdJobs.length,
          quantityCount: createdJobs.reduce((sum, entry) => sum + Math.max(0, Number(entry.qty || 0)), 0),
        }).catch((logError) => {
          console.error("Failed to complete programmer job log", logError);
        });

        if (saveCancelledRef.current) {
          return;
        }
        setJobs((prev) => [...createdJobs, ...prev]);

        finishSaveAndReturnToProgrammerTable("Job created successfully!");
      }
    } catch (error) {
      setSavingJob(false);

      if (saveCancelledRef.current) {
        return;
      }
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
    setToast,
    setSavingJob,
    finishSaveAndReturnToProgrammerTable,
  ]);

  const handleDeleteJob = useCallback(
    async (groupId: string) => {
      try {
        await deleteJobsByGroupId(groupId);
        setJobs((prev) => prev.filter((job) => String(job.groupId) !== groupId));
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
    async (selectedJobIds: Set<string>) => {
      if (selectedJobIds.size === 0) return;

      try {
        const deletePromises = Array.from(selectedJobIds).map((groupId) =>
          deleteJobsByGroupId(groupId)
        );
        await Promise.all(deletePromises);

        setJobs((prev) => prev.filter((job) => !selectedJobIds.has(String(job.groupId))));
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
    (groupId: string) => {
      navigate(`/programmer/edit/${groupId}`);
    },
    [navigate]
  );

  return {
    handleSaveJob,
    handleDeleteJob,
    handleMassDelete,
    handleEditJob,
    cancelSave,
  };
};
