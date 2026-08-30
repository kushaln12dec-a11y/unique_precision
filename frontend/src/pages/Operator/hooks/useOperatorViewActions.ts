import { useCallback } from "react";
import type { CutInputData } from "../types/cutInput";
import type { JobEntry } from "../../../types/job";
import { useOperatorViewActionState } from "./useOperatorViewActionState";
import { useOperatorPersistenceActions } from "./useOperatorPersistenceActions";
import { useOperatorRunActions } from "./useOperatorRunActions";

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

  const ensureCurrentUserAssigned = useCallback((_job?: JobEntry) => {
    // Business rule update: Any authorized operator should be able to start/resume/end.
    return true;
  }, []);

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
