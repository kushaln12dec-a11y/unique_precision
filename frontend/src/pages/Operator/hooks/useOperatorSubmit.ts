import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";

/**
 * Hook for handling operator form submission
 */
export const useOperatorSubmit = (
  groupId: string | null,
  jobs: JobEntry[],
  _cutInputs: Map<number | string, CutInputData>,
  setExpandedCuts: React.Dispatch<React.SetStateAction<Set<number | string>>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>
) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });

  const handleSubmit = async () => {
    if (!groupId || jobs.length === 0) return;
    setValidationErrors(new Map());
    setExpandedCuts(new Set());
    navigate("/operator");
  };

  return {
    handleSubmit,
    toast,
    setToast,
  };
};
