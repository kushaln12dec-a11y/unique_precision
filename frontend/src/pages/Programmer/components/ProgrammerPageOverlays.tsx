import Toast from "../../../components/Toast";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import JobDetailsModal from "./JobDetailsModal";
import { MassDeleteButton } from "./MassDeleteButton";

type ProgrammerPageOverlaysProps = {
  toast: { message: string; variant: "success" | "error" | "info"; visible: boolean };
  setToast: React.Dispatch<React.SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
  showDeleteModal: boolean;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  jobToDelete: { customer: string } | null;
  setJobToDelete: React.Dispatch<React.SetStateAction<any>>;
  handleDeleteConfirm: () => Promise<void>;
  showJobViewModal: boolean;
  viewingJob: any;
  setShowJobViewModal: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingJob: React.Dispatch<React.SetStateAction<any>>;
  getUserRole: () => string | null;
  showMassDelete: boolean;
  selectedCount: number;
  onMassDelete: () => Promise<void>;
  onClearSelection: () => void;
};

const ProgrammerPageOverlays = ({
  toast,
  setToast,
  showDeleteModal,
  setShowDeleteModal,
  jobToDelete,
  setJobToDelete,
  handleDeleteConfirm,
  showJobViewModal,
  viewingJob,
  setShowJobViewModal,
  setViewingJob,
  getUserRole,
  showMassDelete,
  selectedCount,
  onMassDelete,
  onClearSelection,
}: ProgrammerPageOverlaysProps) => (
  <>
    <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={() => setToast({ ...toast, visible: false })} />
    {showDeleteModal && jobToDelete && (
      <ConfirmDeleteModal
        title="Confirm Delete"
        message="Are you sure you want to delete this job?"
        details={[{ label: "Customer", value: jobToDelete.customer }]}
        confirmButtonText="Delete Job"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setJobToDelete(null);
        }}
      />
    )}
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
    {showMassDelete && <MassDeleteButton selectedCount={selectedCount} onDelete={onMassDelete} onClear={onClearSelection} />}
  </>
);

export default ProgrammerPageOverlays;
