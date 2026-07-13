import Toast from "../../../components/Toast";
import JobDetailsModal from "../../Programmer/components/JobDetailsModal";
import { MassDeleteButton } from "../../Programmer/components/MassDeleteButton";
import SendToQaModal from "./SendToQaModal";
import BulkAssignmentModal from "./BulkAssignmentModal";
import type { OperatorTableRow } from "../types";
import type { JobEntry } from "../../../types/job";

type OperatorPageOverlaysProps = {
  activeTab: "jobs" | "logs" | "logged_jobs";
  viewingJob: OperatorTableRow | null;
  showJobViewModal: boolean;
  setShowJobViewModal: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingJob: React.Dispatch<React.SetStateAction<OperatorTableRow | null>>;
  getUserRole: () => string | null;
  isSendToQaModalOpen: boolean;
  sendToQaTargets: any[];
  isSendingToQa: boolean;
  isBulkAssignmentModalOpen: boolean;
  bulkAssignmentJobs: JobEntry[];
  isApplyingBulkAssignment: boolean;
  setIsSendToQaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSendToQaTargets: React.Dispatch<React.SetStateAction<any[]>>;
  handleConfirmSendToQa: (payload: Array<{ jobId: string; quantityNumbers: number[] }>) => void | Promise<void>;
  handleCloseBulkAssignmentModal: () => void;
  handleOpenBulkAssignmentModal: () => void;
  handleConfirmBulkAssignment: (payload: Array<{
    jobId: string;
    fromQty: number;
    toQty: number;
    operators: string[];
    machineNumbers: string[];
  }>) => void | Promise<void>;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  toast: { message: string; variant: "success" | "error" | "info"; visible: boolean; actionLink?: { label: string; href: string } };
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean; actionLink?: { label: string; href: string } }>>;
  selectedEntryIds: Set<string | number>;
  handleDeleteSelectedRows: () => void | Promise<void>;
  setSelectedEntryIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  setSelectedJobIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const OperatorPageOverlays = ({
  activeTab,
  viewingJob,
  showJobViewModal,
  setShowJobViewModal,
  setViewingJob,
  getUserRole,
  isSendToQaModalOpen,
  sendToQaTargets,
  isSendingToQa,
  isBulkAssignmentModalOpen,
  bulkAssignmentJobs,
  isApplyingBulkAssignment,
  setIsSendToQaModalOpen,
  setSendToQaTargets,
  handleConfirmSendToQa,
  handleCloseBulkAssignmentModal,
  handleOpenBulkAssignmentModal,
  handleConfirmBulkAssignment,
  operatorUsers,
  machineOptions,
  toast,
  setToast,
  selectedEntryIds,
  handleDeleteSelectedRows,
  setSelectedEntryIds,
  setSelectedJobIds,
}: OperatorPageOverlaysProps) => (
  <>
    {showJobViewModal && viewingJob && (
      <JobDetailsModal
        job={viewingJob}
        userRole={getUserRole()}
        onClose={() => {
          setShowJobViewModal(false);
          setViewingJob(null);
        }}
      />
    )}
    <SendToQaModal
      isOpen={isSendToQaModalOpen}
      targets={sendToQaTargets}
      isSubmitting={isSendingToQa}
      onClose={() => {
        if (isSendingToQa) return;
        setIsSendToQaModalOpen(false);
        setSendToQaTargets([]);
      }}
      onConfirm={handleConfirmSendToQa}
    />
    <BulkAssignmentModal
      isOpen={isBulkAssignmentModalOpen}
      jobs={bulkAssignmentJobs}
      operatorUsers={operatorUsers}
      machineOptions={machineOptions}
      isSubmitting={isApplyingBulkAssignment}
      onClose={handleCloseBulkAssignmentModal}
      onConfirm={handleConfirmBulkAssignment}
    />
    <Toast
      message={toast.message}
      visible={toast.visible}
      variant={toast.variant}
      actionLink={toast.actionLink}
      onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
    />
    {activeTab === "jobs" && (
      <MassDeleteButton
        selectedCount={selectedEntryIds.size}
        onAssign={selectedEntryIds.size > 0 ? handleOpenBulkAssignmentModal : undefined}
        onDelete={handleDeleteSelectedRows}
        onClear={() => {
          setSelectedEntryIds(new Set());
          setSelectedJobIds(new Set());
        }}
      />
    )}
  </>
);

export default OperatorPageOverlays;
