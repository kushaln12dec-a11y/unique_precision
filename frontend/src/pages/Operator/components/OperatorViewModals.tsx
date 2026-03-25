import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import type { JobEntry } from "../../../types/job";
import type { Dispatch, SetStateAction } from "react";

type PendingDispatch = { cutId: number | string; quantityNumbers: number[] } | null;
type PendingQuantity = { cutId: number | string; quantityIndex: number } | null;

type OperatorViewModalsProps = {
  jobs: JobEntry[];
  pendingDispatch: PendingDispatch;
  setPendingDispatch: Dispatch<SetStateAction<PendingDispatch>>;
  pendingReset: PendingQuantity;
  setPendingReset: Dispatch<SetStateAction<PendingQuantity>>;
  pendingShiftOver: PendingQuantity;
  setPendingShiftOver: Dispatch<SetStateAction<PendingQuantity>>;
  handleUpdateQaStatus: (cutId: number | string, quantityNumbers: number[], status: "SENT_TO_QA" | "SAVED" | "READY_FOR_QA") => Promise<void>;
  handleInputChange: (
    cutId: number | string,
    quantityIndex: number,
    field: "markShiftOver" | "resetTimer",
    value: string
  ) => void;
  setActionToast: Dispatch<SetStateAction<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>>;
};

const OperatorViewModals = ({
  jobs,
  pendingDispatch,
  setPendingDispatch,
  pendingReset,
  setPendingReset,
  pendingShiftOver,
  setPendingShiftOver,
  handleUpdateQaStatus,
  handleInputChange,
  setActionToast,
}: OperatorViewModalsProps) => {
  const pendingDispatchJob = pendingDispatch
    ? jobs.find((job) => String(job.id) === String(pendingDispatch.cutId))
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
          onConfirm={() => {
            handleInputChange(pendingReset.cutId, pendingReset.quantityIndex, "resetTimer", "");
            setPendingReset(null);
          }}
          onCancel={() => setPendingReset(null)}
        />
      )}

      {pendingShiftOver && (
        <ConfirmDeleteModal
          title="Confirm Shift Over"
          message="Mark this running quantity as idle due to shift over?"
          details={[
            { label: "Setting", value: String(jobs.findIndex((j) => String(j.id) === String(pendingShiftOver.cutId)) + 1) },
            { label: "Quantity", value: String(pendingShiftOver.quantityIndex + 1) },
          ]}
          confirmButtonText="Mark Shift Over"
          onConfirm={() => {
            handleInputChange(pendingShiftOver.cutId, pendingShiftOver.quantityIndex, "markShiftOver", "");
            setActionToast({
              message: "Shift Over marked as idle. Save the quantity and click Submit so the next operator can resume.",
              variant: "info",
              visible: true,
            });
            setTimeout(() => {
              setActionToast((prev) => ({ ...prev, visible: false }));
            }, 3200);
            setPendingShiftOver(null);
          }}
          onCancel={() => setPendingShiftOver(null)}
        />
      )}
    </>
  );
};

export default OperatorViewModals;
