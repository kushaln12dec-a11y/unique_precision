import { useCallback, useState } from "react";
import { createOperatorTaskSwitchLog } from "../../../services/employeeLogsApi";
import { deleteJob } from "../../../services/jobApi";
import { updateOperatorJob, updateOperatorQaStatus } from "../../../services/operatorApi";
import { getDispatchableQuantityNumbers, getQuantityProgressStatuses } from "../utils/qaProgress";
import type { JobEntry } from "../../../types/job";
import type { SendToQaModalTarget } from "../components/SendToQaModal";
import type { OperatorTableRow } from "../types";

type ToastSetter = React.Dispatch<
  React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>
>;

type Params = {
  operatorGridJobs: JobEntry[];
  setJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setOperatorGridJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  tableDataRef: React.MutableRefObject<OperatorTableRow[]>;
  setToast: ToastSetter;
};

const showTimedToast = (setToast: ToastSetter, message: string, variant: "success" | "error" | "info") => {
  setToast({ message, variant, visible: true });
  setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
};

const buildSendToQaTargets = (entries: JobEntry[], tableData: OperatorTableRow[]): SendToQaModalTarget[] => {
  const dedupedEntries = Array.from(new Map(entries.map((entry) => [String(entry.id), entry])).values());
  const targets: SendToQaModalTarget[] = [];
  dedupedEntries.forEach((entry, index) => {
    const totalQty = Math.max(1, Number(entry.qty || 1));
    const statuses = getQuantityProgressStatuses(entry, totalQty);
    const statusByQuantity = statuses.reduce<Record<number, any>>((acc, status, qtyIndex) => {
      acc[qtyIndex + 1] = status;
      return acc;
    }, {});
    const eligibleQuantityNumbers = getDispatchableQuantityNumbers(entry);
    if (eligibleQuantityNumbers.length === 0) return;
    const groupEntries = tableData.find((row) => row.groupId === String(entry.groupId))?.entries || [];
    const sortedGroupEntryIds = groupEntries.map((job) => String(job.id));
    const rowType = sortedGroupEntryIds.length > 0 && sortedGroupEntryIds[0] === String(entry.id) ? "parent" : "child";
    const settingIndex = groupEntries.findIndex((job) => String(job.id) === String(entry.id));
    targets.push({
      jobId: String(entry.id),
      groupId: String(entry.groupId),
      customer: entry.customer || "",
      description: entry.description || "",
      refNumber: entry.refNumber || "",
      settingLabel: String(settingIndex >= 0 ? settingIndex + 1 : index + 1),
      totalQty,
      eligibleQuantityNumbers,
      statusByQuantity,
      defaultSelectedQuantityNumbers: eligibleQuantityNumbers,
      rowType,
    });
  });
  return targets;
};

export const useOperatorActions = ({ operatorGridJobs, setJobs, setOperatorGridJobs, tableDataRef, setToast }: Params) => {
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string | number>>(new Set());
  const [sendToQaTargets, setSendToQaTargets] = useState<SendToQaModalTarget[]>([]);
  const [isSendToQaModalOpen, setIsSendToQaModalOpen] = useState(false);
  const [isSendingToQa, setIsSendingToQa] = useState(false);

  const updateJobsInState = useCallback((updater: (job: JobEntry) => JobEntry) => {
    setJobs((prev) => prev.map(updater));
    setOperatorGridJobs((prev) => prev.map(updater));
  }, [setJobs, setOperatorGridJobs]);

  const handleChildRowSelect = useCallback((groupId: string, rowKey: string | number, selected: boolean) => {
    const normalizedKey = String(rowKey);
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(normalizedKey);
      else next.delete(normalizedKey);
      const groupEntries = operatorGridJobs.filter((job) => String(job.groupId) === groupId);
      const allKeys = groupEntries.map((entry) => (entry.id == null ? null : String(entry.id))).filter((key): key is string => key !== null);
      setSelectedJobIds((prevGroups) => {
        const nextGroups = new Set(prevGroups);
        const allSelected = allKeys.length > 0 && allKeys.every((key) => next.has(key));
        if (allSelected) nextGroups.add(groupId);
        else nextGroups.delete(groupId);
        return nextGroups;
      });
      return next;
    });
  }, [operatorGridJobs]);

  const openSendToQaModal = useCallback((entries: JobEntry[]) => {
    const targets = buildSendToQaTargets(entries, tableDataRef.current);
    if (targets.length === 0) {
      showTimedToast(setToast, "No logged quantities are ready to send to QC.", "error");
      return;
    }
    setSendToQaTargets(targets);
    setIsSendToQaModalOpen(true);
  }, [setToast, tableDataRef]);

  const handleSendSelectedRowsToQa = useCallback(() => {
    if (selectedEntryIds.size === 0) {
      showTimedToast(setToast, "Select at least one row to send to QC.", "error");
      return;
    }
    const selectedKeySet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
    const selectedEntries = tableDataRef.current.flatMap((row) => row.entries).filter((entry) => selectedKeySet.has(String(entry.id)));
    if (selectedEntries.length === 0) {
      showTimedToast(setToast, "No valid rows selected.", "error");
      return;
    }
    openSendToQaModal(selectedEntries);
  }, [openSendToQaModal, selectedEntryIds, setToast, tableDataRef]);

  const handleConfirmSendToQa = useCallback(async (updates: Array<{ jobId: string; quantityNumbers: number[] }>) => {
    if (updates.length === 0) return;
    setIsSendingToQa(true);
    try {
      await Promise.all(updates.map((item) => updateOperatorQaStatus(item.jobId, { quantityNumbers: item.quantityNumbers, status: "SENT_TO_QA" })));
      updateJobsInState((job) => {
        const targetUpdate = updates.find((item) => item.jobId === String(job.id));
        if (!targetUpdate) return job;
        const nextStates = { ...(job.quantityQaStates || {}) };
        targetUpdate.quantityNumbers.forEach((qty) => {
          nextStates[String(qty)] = "SENT_TO_QA";
        });
        return { ...job, quantityQaStates: nextStates };
      });
      setSelectedEntryIds(new Set());
      setSelectedJobIds(new Set());
      setIsSendToQaModalOpen(false);
      setSendToQaTargets([]);
      showTimedToast(setToast, "Selected quantities sent to QC.", "success");
    } catch {
      showTimedToast(setToast, "Failed to send quantities to QC.", "error");
    } finally {
      setIsSendingToQa(false);
    }
  }, [setToast, updateJobsInState]);

  const handleDeleteSelectedRows = useCallback(async () => {
    if (selectedEntryIds.size === 0) {
      showTimedToast(setToast, "Select at least one row to delete.", "error");
      return;
    }
    try {
      const selectedIdSet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
      await Promise.all(Array.from(selectedIdSet).map((id) => deleteJob(id)));
      setJobs((prev) => prev.filter((job) => !selectedIdSet.has(String(job.id))));
      setOperatorGridJobs((prev) => prev.filter((job) => !selectedIdSet.has(String(job.id))));
      setSelectedEntryIds(new Set());
      setSelectedJobIds(new Set());
      showTimedToast(setToast, "Selected rows deleted.", "success");
    } catch {
      showTimedToast(setToast, "Failed to delete selected rows.", "error");
    }
  }, [selectedEntryIds, setJobs, setOperatorGridJobs, setToast]);

  const handleApplyBulkAssignment = useCallback(async (payload: { operators: string[]; machineNumber: string }) => {
    if (selectedEntryIds.size === 0) {
      showTimedToast(setToast, "Select at least one row first.", "error");
      return;
    }
    const operators = [...new Set(payload.operators.map((name) => name.trim().toUpperCase()).filter(Boolean))];
    const selectedOperator = operators[0] || "";
    const machineNumber = String(payload.machineNumber || "").trim();
    if (!selectedOperator && !machineNumber) {
      showTimedToast(setToast, "Choose operator or machine to apply.", "error");
      return;
    }
    const selectedIdSet = new Set(Array.from(selectedEntryIds, (id) => String(id)));
    const targetEntries = tableDataRef.current.flatMap((row) => row.entries).filter((entry) => selectedIdSet.has(String(entry.id)));
    if (targetEntries.length === 0) {
      showTimedToast(setToast, "No valid selected rows found.", "error");
      return;
    }
    const assignedToValue = selectedOperator || null;
    try {
      await Promise.all(targetEntries.map((entry) => {
        const updatePayload: Record<string, string> = {};
        if (assignedToValue !== null) updatePayload.assignedTo = assignedToValue;
        if (machineNumber) updatePayload.machineNumber = machineNumber;
        return updateOperatorJob(String(entry.id), updatePayload);
      }));
      updateJobsInState((job) => !selectedIdSet.has(String(job.id))
        ? job
        : { ...job, ...(assignedToValue !== null ? { assignedTo: assignedToValue } : {}), ...(machineNumber ? { machineNumber } : {}) });
      showTimedToast(setToast, `Updated ${targetEntries.length} selected row(s).`, "success");
    } catch {
      showTimedToast(setToast, "Failed to update selected rows.", "error");
    }
  }, [selectedEntryIds, setToast, tableDataRef, updateJobsInState]);

  const handleSaveTaskSwitch = useCallback(async (payload: { idleTime: string; remark: string; startedAt: string; endedAt: string; durationSeconds: number }) => {
    await createOperatorTaskSwitchLog(payload);
  }, []);

  return {
    selectedJobIds,
    setSelectedJobIds,
    selectedEntryIds,
    setSelectedEntryIds,
    sendToQaTargets,
    setSendToQaTargets,
    isSendToQaModalOpen,
    setIsSendToQaModalOpen,
    isSendingToQa,
    handleChildRowSelect,
    openSendToQaModal,
    handleSendSelectedRowsToQa,
    handleConfirmSendToQa,
    handleDeleteSelectedRows,
    handleApplyBulkAssignment,
    handleSaveTaskSwitch,
    showTimedToast,
  };
};
