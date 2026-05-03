import { useCallback } from "react";
import type { CutInputData } from "../types/cutInput";
import type { JobEntry } from "../../../types/job";
import { showAndHideToast } from "../utils/operatorViewActionUtils";
import { useOperatorViewActionState } from "./useOperatorViewActionState";
import { useOperatorPersistenceActions } from "./useOperatorPersistenceActions";
import { useOperatorRunActions } from "./useOperatorRunActions";

type Params = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>;
  currentUserDisplayName: string;
  isAdmin: boolean;
};

const parseAssignedOperators = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => String(entry || "").trim().toUpperCase())
    .filter((entry) => entry && entry !== "UNASSIGN" && entry !== "UNASSIGNED");

export const useOperatorViewActions = ({ jobs, cutInputs, setCutInputs, setValidationErrors, currentUserDisplayName, isAdmin }: Params) => {
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

  const ensureCurrentUserAssigned = useCallback((job: JobEntry | undefined) => {
    if (isAdmin) return true;
    const assignedOperators = parseAssignedOperators(job?.assignedTo || "");
    const isAssigned = assignedOperators.includes(String(currentUserDisplayName || "").trim().toUpperCase());
    if (!isAssigned) {
      showAndHideToast(setActionToast, "Your name must be assigned to this job before you can run it.", "error", 3500);
      return false;
    }
    return true;
  }, [currentUserDisplayName, isAdmin]);

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
