import { useMemo } from "react";
import type { CutForm } from "../programmerUtils";
import { validateCut } from "../utils/validation";

/**
 * Hook for job form validation and save logic
 */
export const useJobFormValidation = (
  cuts: CutForm[],
  savedCuts: Set<number>,
  setSavedCuts: React.Dispatch<React.SetStateAction<Set<number>>>,
  setCutValidationErrors: React.Dispatch<React.SetStateAction<Record<number, Record<string, string>>>>
) => {
  const handleSaveCut = (index: number, cut: CutForm) => {
    const errors = validateCut(cut);
    if (Object.keys(errors).length > 0) {
      setCutValidationErrors((prev) => ({
        ...prev,
        [index]: errors,
      }));
      setSavedCuts((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    setCutValidationErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    setSavedCuts((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const allCutsSaved = useMemo(() => {
    return cuts.length > 0 && cuts.every((_, index) => savedCuts.has(index));
  }, [cuts.length, savedCuts]);

  return {
    handleSaveCut,
    allCutsSaved,
  };
};
