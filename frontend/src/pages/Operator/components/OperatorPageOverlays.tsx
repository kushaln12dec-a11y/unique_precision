import Toast from "../../../components/Toast";
import JobDetailsModal from "../../Programmer/components/JobDetailsModal";
import { MassDeleteButton } from "../../Programmer/components/MassDeleteButton";
import SendToQaModal from "./SendToQaModal";
import type { OperatorTableRow } from "../types";

type OperatorPageOverlaysProps = {
  activeTab: "jobs" | "logs";
  viewingJob: OperatorTableRow | null;
  showJobViewModal: boolean;
  setShowJobViewModal: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingJob: React.Dispatch<React.SetStateAction<OperatorTableRow | null>>;
  getUserRole: () => string | null;
  isSendToQaModalOpen: boolean;
  sendToQaTargets: any[];
  isSendingToQa: boolean;
  setIsSendToQaModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSendToQaTargets: React.Dispatch<React.SetStateAction<any[]>>;
  handleConfirmSendToQa: (payload: Array<{ jobId: string; quantityNumbers: number[] }>) => void | Promise<void>;
  toast: { message: string; variant: "success" | "error" | "info"; visible: boolean };
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
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
  setIsSendToQaModalOpen,
  setSendToQaTargets,
  handleConfirmSendToQa,
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
    <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={() => setToast((prev) => ({ ...prev, visible: false }))} />
    {activeTab === "jobs" && (
      <MassDeleteButton
        selectedCount={selectedEntryIds.size}
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
