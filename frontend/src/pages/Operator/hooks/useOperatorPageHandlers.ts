import { useCallback } from "react";
import { updateOperatorJob } from "../../../services/operatorApi";
import type { JobEntry } from "../../../types/job";

type ToastSetter = React.Dispatch<
  React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
>;

type Params = {
  jobs: JobEntry[];
  navigate: (path: string) => void;
  setJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setOperatorGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setToast: ToastSetter;
  userRole: string;
  currentUserDisplayName: string;
};

export const useOperatorPageHandlers = ({
  jobs,
  navigate,
  setJobs,
  setOperatorGridJobs,
  setToast,
  userRole,
  currentUserDisplayName,
}: Params) => {
  const syncJob = useCallback(
    (matcher: (job: JobEntry) => boolean, updater: (job: JobEntry) => JobEntry) => {
      setJobs((prev) => prev.map((job) => (matcher(job) ? updater(job) : job)));
      setOperatorGridJobs((prev) => prev.map((job) => (matcher(job) ? updater(job) : job)));
    },
    [setJobs, setOperatorGridJobs]
  );

  const handleAssignChange = useCallback(
    async (jobId: number | string, value: string) => {
      try {
        const normalizedValue = String(value || "").trim();
        const isUnassign = !normalizedValue || normalizedValue.toLowerCase() === "unassign" || normalizedValue.toLowerCase() === "unassigned";
        const nextAssignedTo =
          userRole === "OPERATOR"
            ? (isUnassign ? "Unassign" : String(currentUserDisplayName || "").trim() || normalizedValue)
            : (isUnassign ? "Unassign" : normalizedValue);
        await updateOperatorJob(String(jobId), { assignedTo: nextAssignedTo });
        syncJob((job) => job.id === jobId, (job) => ({ ...job, assignedTo: nextAssignedTo }));
      } catch (error) {
        console.error("Failed to update job assignment", error);
        setToast({ message: "Failed to update assignment. Please try again.", variant: "error", visible: true });
      }
    },
    [currentUserDisplayName, setToast, syncJob, userRole]
  );

  const handleMachineNumberChange = useCallback(
    async (groupId: string, machineNumber: string) => {
      try {
        const targetJobs = jobs.filter((job) => String(job.groupId) === groupId);
        if (targetJobs.length === 0) return;
        await Promise.all(targetJobs.map((job) => updateOperatorJob(String(job.id), { machineNumber })));
        syncJob((job) => String(job.groupId) === groupId, (job) => ({ ...job, machineNumber }));
      } catch {
        setToast({ message: "Failed to update machine number.", variant: "error", visible: true });
      }
    },
    [jobs, setToast, syncJob]
  );

  const handleChildMachineNumberChange = useCallback(
    async (jobId: number | string, machineNumber: string) => {
      try {
        await updateOperatorJob(String(jobId), { machineNumber });
        syncJob((job) => String(job.id) === String(jobId), (job) => ({ ...job, machineNumber }));
      } catch {
        setToast({ message: "Failed to update machine number.", variant: "error", visible: true });
      }
    },
    [setToast, syncJob]
  );

  const handleImageInput = useCallback(
    (groupId: string, cutId?: string | number) => {
      const normalizedCutId = String(cutId ?? "").trim();
      navigate(
        normalizedCutId
          ? `/operator/viewpage?groupId=${groupId}&cutId=${encodeURIComponent(normalizedCutId)}`
          : `/operator/viewpage?groupId=${groupId}`
      );
    },
    [navigate]
  );

  const handleSubmit = useCallback((groupId: string) => navigate(`/operator/viewpage?groupId=${groupId}`), [navigate]);

  return {
    handleAssignChange,
    handleMachineNumberChange,
    handleChildMachineNumberChange,
    handleImageInput,
    handleSubmit,
  };
};
