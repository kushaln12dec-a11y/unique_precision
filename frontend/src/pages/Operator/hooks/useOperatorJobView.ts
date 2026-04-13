import { useCallback, useState } from "react";
import type { JobEntry } from "../../../types/job";
import type { OperatorTableRow } from "../types";

export const useOperatorJobView = () => {
  const [viewingJob, setViewingJob] = useState<OperatorTableRow | null>(null);
  const [showJobViewModal, setShowJobViewModal] = useState(false);

  const handleViewJob = useCallback((row: OperatorTableRow) => {
    setViewingJob(row);
    setShowJobViewModal(true);
  }, []);

  const handleViewEntry = useCallback((entry: JobEntry) => {
    setViewingJob({
      groupId: String(entry.groupId),
      parent: entry,
      entries: [entry],
      groupTotalHrs: Number(entry.totalHrs || 0),
      groupTotalAmount: Number(entry.totalAmount || 0),
    });
    setShowJobViewModal(true);
  }, []);

  return {
    handleViewEntry,
    handleViewJob,
    setShowJobViewModal,
    setViewingJob,
    showJobViewModal,
    viewingJob,
  };
};
