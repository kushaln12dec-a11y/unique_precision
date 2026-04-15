import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import type { Dispatch, SetStateAction } from "react";
import OperatorActionModal from "./OperatorActionModal";

type PendingDispatch = { cutId: number | string; quantityNumbers: number[] } | null;
type PendingQuantity = { cutId: number | string; quantityIndex: number } | null;
type PendingOperatorAction = { cutId: number | string; quantityIndex: number; action: "shiftOver" | "resume" } | null;
type PendingEndTimeCapture = { cutId: number | string; quantityIndex: number } | null;

type OperatorViewModalsProps = {
  jobs: JobEntry[];
  pendingDispatch: PendingDispatch;
  setPendingDispatch: Dispatch<SetStateAction<PendingDispatch>>;
  pendingReset: PendingQuantity;
  setPendingReset: Dispatch<SetStateAction<PendingQuantity>>;
  pendingOperatorAction: PendingOperatorAction;
  setPendingOperatorAction: Dispatch<SetStateAction<PendingOperatorAction>>;
  pendingEndTimeCapture: PendingEndTimeCapture;
  setPendingEndTimeCapture: Dispatch<SetStateAction<PendingEndTimeCapture>>;
  handleUpdateQaStatus: (cutId: number | string, quantityNumbers: number[], status: "SENT_TO_QA" | "SAVED" | "READY_FOR_QA") => Promise<void>;
  handleResetQuantity: (cutId: number | string, quantityIndex: number) => Promise<void>;
  handleInputChange: (
    cutId: number | string,
    quantityIndex: number,
    field: "markShiftOver" | "resumeShiftOver",
    value: string
  ) => void;
  handlePauseResumeAction: (cutId: number | string, quantityIndex: number, action: "shiftOver" | "resume") => Promise<boolean>;
  handleConfirmEndTimeCapture: (cutId: number | string, quantityIndex: number) => void;
  setActionToast: Dispatch<SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
};

const OperatorViewModals = ({
  jobs,
  pendingDispatch,
  setPendingDispatch,
  pendingReset,
  setPendingReset,
  pendingOperatorAction,
  setPendingOperatorAction,
  pendingEndTimeCapture,
  setPendingEndTimeCapture,
  handleUpdateQaStatus,
  handleResetQuantity,
  handleInputChange,
  handlePauseResumeAction,
  handleConfirmEndTimeCapture,
  setActionToast,
}: OperatorViewModalsProps) => {
  const pendingDispatchJob = pendingDispatch
    ? jobs.find((job) => String(job.id) === String(pendingDispatch.cutId))
    : null;
  const pendingEndTimeJob = pendingEndTimeCapture
    ? jobs.find((job) => String(job.id) === String(pendingEndTimeCapture.cutId))
    : null;

  return (
    <>
      {pendingDispatch && (
        <ConfirmDeleteModal
          title="Confirm Dispatch"
          message="Are you sure you want to dispatch selected quantity to QC?"
          details={[
            {
              label: "Setting",
              value: pendingDispatchJob
                ? String(jobs.findIndex((j) => String(j.id) === String(pendingDispatch.cutId)) + 1)
                : "N/A",
            },
            { label: "Quantities", value: pendingDispatch.quantityNumbers.join(", ") },
          ]}
          confirmButtonText="Dispatch To QC"
          onConfirm={async () => {
            await handleUpdateQaStatus(pendingDispatch.cutId, pendingDispatch.quantityNumbers, "SENT_TO_QA");
            setPendingDispatch(null);
          }}
          onCancel={() => setPendingDispatch(null)}
        />
      )}

      {pendingReset && (
        <ConfirmDeleteModal
          title="Confirm Reset"
          message="Are you sure you want to reset this quantity timer?"
          details={[
            { label: "Setting", value: String(jobs.findIndex((j) => String(j.id) === String(pendingReset.cutId)) + 1) },
            { label: "Quantity", value: String(pendingReset.quantityIndex + 1) },
          ]}
          confirmButtonText="Reset Timer"
          onConfirm={async () => {
            await handleResetQuantity(pendingReset.cutId, pendingReset.quantityIndex);
            setPendingReset(null);
          }}
          onCancel={() => setPendingReset(null)}
        />
      )}

      {pendingOperatorAction && (
        <OperatorActionModal
          action={pendingOperatorAction.action}
          settingNumber={jobs.findIndex((j) => String(j.id) === String(pendingOperatorAction.cutId)) + 1}
          quantityNumber={pendingOperatorAction.quantityIndex + 1}
          onConfirm={async () => {
            const success = await handlePauseResumeAction(
              pendingOperatorAction.cutId,
              pendingOperatorAction.quantityIndex,
              pendingOperatorAction.action
            );
            if (!success) return;
            handleInputChange(
              pendingOperatorAction.cutId,
              pendingOperatorAction.quantityIndex,
              pendingOperatorAction.action === "resume" ? "resumeShiftOver" : "markShiftOver",
              ""
            );
            setActionToast({
              message: pendingOperatorAction.action === "resume" ? "Quantity resumed." : "Shift over saved.",
              variant: "info",
              visible: true,
            });
            setTimeout(() => {
              setActionToast((prev) => ({ ...prev, visible: false }));
            }, 3200);
            setPendingOperatorAction(null);
          }}
          onCancel={() => setPendingOperatorAction(null)}
        />
      )}

      <Modal
        isOpen={Boolean(pendingEndTimeCapture)}
        onClose={() => setPendingEndTimeCapture(null)}
        title="Confirm End Time"
        size="small"
      >
        {pendingEndTimeCapture ? (
          <div className="operator-endtime-confirm">
            <p>Are you sure you want to capture the end time for this quantity?</p>
            <div className="user-details">
              <p><strong>Setting:</strong> {pendingEndTimeJob ? String(jobs.findIndex((j) => String(j.id) === String(pendingEndTimeCapture.cutId)) + 1) : "N/A"}</p>
              <p><strong>Quantity:</strong> {String(pendingEndTimeCapture.quantityIndex + 1)}</p>
              <p><strong>Job Ref:</strong> {String(pendingEndTimeJob?.refNumber || "-")}</p>
            </div>
            <div className="confirm-delete-footer">
              <button type="button" className="btn-secondary" onClick={() => setPendingEndTimeCapture(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  handleConfirmEndTimeCapture(pendingEndTimeCapture.cutId, pendingEndTimeCapture.quantityIndex);
                  setPendingEndTimeCapture(null);
                }}
              >
                Confirm End Time
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default OperatorViewModals;
