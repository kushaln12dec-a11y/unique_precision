import { useCallback } from "react";
import type { CutInputData } from "../types/cutInput";
import type { JobEntry } from "../../../types/job";
import { useOperatorViewActionState } from "./useOperatorViewActionState";
import { useOperatorPersistenceActions } from "./useOperatorPersistenceActions";
import { useOperatorRunActions } from "./useOperatorRunActions";
import { showAndHideToast } from "../utils/operatorViewActionUtils";

type Params = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>;
  currentUserDisplayName: string;
};

export const useOperatorViewActions = ({ jobs, cutInputs, setCutInputs, setValidationErrors, currentUserDisplayName }: Params) => {
  const {
    operatorUsers,
    savedQuantities,
    setSavedQuantities,
    savedRanges,
    setSavedRanges,
    qaStatusesByCut,
    setQaStatusesByCut,
    activeOperatorLogIds,
    setActiveOperatorLogIds,
    resolveActiveOperatorLogId,
    saveToast,
    setSaveToast,
    actionToast,
    setActionToast,
    pendingDispatch,
    setPendingDispatch,
    pendingReset,
    setPendingReset,
    amounts,
  } = useOperatorViewActionState({ jobs });

  const clearQuantityErrors = useCallback((cutId: number | string, quantityIndex: number) => {
    setValidationErrors((prev) => {
      const next = new Map(prev);
      const cutErrors = next.get(cutId);
      if (!cutErrors) return next;
      const { [quantityIndex]: _, ...rest } = cutErrors;
      if (Object.keys(rest).length === 0) next.delete(cutId);
      else next.set(cutId, rest);
      return next;
    });
  }, [setValidationErrors]);

  const ensureCurrentUserAssigned = useCallback((
    _job?: JobEntry,
    cutId?: number | string,
    quantityIndex?: number
  ): boolean => {
    const normalizedUser = String(currentUserDisplayName || "").trim().toUpperCase();
    if (!normalizedUser) {
      showAndHideToast(setActionToast, "Cannot identify your user account. Please log in again.", "error", 3500);
      return false;
    }

    if (cutId !== undefined && quantityIndex !== undefined) {
      const qtyData = cutInputs.get(cutId)?.quantities?.[quantityIndex];
      if (qtyData) {
        const opsNameList = Array.isArray(qtyData.opsName)
          ? qtyData.opsName.map((n) => String(n || "").trim().toUpperCase()).filter(Boolean)
          : [];
        if (opsNameList.length === 0) {
          showAndHideToast(setActionToast, "Select your name in the Ops Name field before starting this job.", "error", 4000);
          return false;
        }
        if (!opsNameList.includes(normalizedUser)) {
          showAndHideToast(setActionToast, `Only assigned operators can run this job. Assign your name first.`, "error", 4000);
          return false;
        }
      }
    }

    return true;
  }, [currentUserDisplayName, cutInputs, setActionToast]);

  const { handleSaveQuantity, handleSaveRange, handleUpdateQaStatus, handleEndTimeCaptured } = useOperatorPersistenceActions({
    jobs,
    cutInputs,
    activeOperatorLogIds,
    resolveActiveOperatorLogId,
    setActiveOperatorLogIds,
    setSavedQuantities,
    setSavedRanges,
    setQaStatusesByCut,
    setSaveToast,
    setActionToast,
    setValidationErrors,
    ensureCurrentUserAssigned,
    clearQuantityErrors,
  });

  const { handleStartTimeCaptured, handlePauseResumeAction } = useOperatorRunActions({
    jobs,
    cutInputs,
    activeOperatorLogIds,
    resolveActiveOperatorLogId,
    setActiveOperatorLogIds,
    setActionToast,
    setCutInputs,
    ensureCurrentUserAssigned,
    currentUserDisplayName,
  });

  return {
    operatorUsers,
    savedQuantities,
    savedRanges,
    qaStatusesByCut,
    saveToast,
    setSaveToast,
    actionToast,
    setActionToast,
    pendingDispatch,
    setPendingDispatch,
    pendingReset,
    setPendingReset,
    amounts,
    handleSaveQuantity,
    handleSaveRange,
    handleUpdateQaStatus,
    handleStartTimeCaptured,
    handlePauseResumeAction,
    handleEndTimeCaptured,
  };
};
