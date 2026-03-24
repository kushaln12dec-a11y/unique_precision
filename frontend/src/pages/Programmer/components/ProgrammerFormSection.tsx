import React from "react";
import AppLoader from "../../../components/AppLoader";
import ProgrammerJobForm from "../ProgrammerJobForm";
import type { MasterConfig } from "../../../types/masterConfig";
import type { CutForm, CalculationResult } from "../programmerUtils";

type Props = {
  shouldRenderJobForm: boolean;
  loadingEditGroup: boolean;
  cuts: CutForm[];
  setCuts: React.Dispatch<React.SetStateAction<CutForm[]>>;
  handleSaveJob: () => void;
  handleCancel: () => void;
  totals: CalculationResult[];
  isAdmin: boolean;
  savingJob: boolean;
  refNumber: string;
  masterConfig: MasterConfig | null;
  editingGroupId: string | null;
  shouldRenderEditLoadingState: boolean;
  shouldRenderEditErrorState: boolean;
  editGroupError: string | null;
  onBack: () => void;
};

export const ProgrammerFormSection: React.FC<Props> = ({
  shouldRenderJobForm,
  loadingEditGroup,
  cuts,
  setCuts,
  handleSaveJob,
  handleCancel,
  totals,
  isAdmin,
  savingJob,
  refNumber,
  masterConfig,
  editingGroupId,
  shouldRenderEditLoadingState,
  shouldRenderEditErrorState,
  editGroupError,
  onBack,
}) => {
  return (
    <>
      {shouldRenderJobForm && (
        loadingEditGroup ? (
          <AppLoader message="Loading job details..." />
        ) : (
          <ProgrammerJobForm
            cuts={cuts}
            setCuts={setCuts}
            onSave={handleSaveJob}
            onCancel={handleCancel}
            totals={totals}
            isAdmin={isAdmin}
            isSaving={savingJob}
            refNumber={refNumber}
            masterConfig={masterConfig}
            formMode={editingGroupId ? "edit" : "draft"}
          />
        )
      )}

      {shouldRenderEditLoadingState && <AppLoader message="Loading job details..." />}

      {shouldRenderEditErrorState && (
        <div className="job-form-card programmer-form-state">
          <div className="programmer-form-state-copy">
            <h2>Unable to open this job</h2>
            <p>{editGroupError || "The requested edit group is not ready yet."}</p>
          </div>
          <div className="programmer-form-state-actions">
            <button type="button" className="btn-secondary" onClick={onBack}>
              Back to Programmer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProgrammerFormSection;
