import { useState, useEffect } from "react";
import type { CutForm } from "../programmerUtils";
import { DEFAULT_CUT } from "../programmerUtils";

/**
 * Hook for managing job form state
 */
export const useJobFormState = (cuts: CutForm[], setCuts: React.Dispatch<React.SetStateAction<CutForm[]>>) => {
  const [collapsedCuts, setCollapsedCuts] = useState<Set<number>>(new Set());
  const [savedCuts, setSavedCuts] = useState<Set<number>>(new Set());
  const [cutValidationErrors, setCutValidationErrors] = useState<Record<number, Record<string, string>>>({});
  const [openPriorityDropdown, setOpenPriorityDropdown] = useState<number | null>(null);

  useEffect(() => {
    setSavedCuts((prev) => {
      const next = new Set<number>();
      prev.forEach((index) => {
        if (index < cuts.length) {
          next.add(index);
        }
      });
      return next;
    });
    setCutValidationErrors((prev) => {
      const next: Record<number, Record<string, string>> = {};
      Object.keys(prev).forEach((key) => {
        const index = Number(key);
        if (!isNaN(index) && index < cuts.length && prev[index]) {
          next[index] = prev[index];
        }
      });
      return next;
    });
  }, [cuts.length]);

  useEffect(() => {
    const primaryCustomer = cuts[0]?.customer ?? "";
    if (!primaryCustomer || cuts.length <= 1) return;
    setCuts((prev) => {
      const needsUpdate = prev.some((cut, idx) => idx > 0 && cut.customer !== primaryCustomer);
      if (!needsUpdate) return prev;
      return prev.map((cut, idx) =>
        idx === 0 || cut.customer === primaryCustomer
          ? cut
          : { ...cut, customer: primaryCustomer }
      );
    });
  }, [cuts.length, cuts[0]?.customer, setCuts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openPriorityDropdown !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.priority-dropdown')) {
          setOpenPriorityDropdown(null);
        }
      }
    };

    if (openPriorityDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openPriorityDropdown]);

  const toggleCut = (index: number) => {
    if (index === 0) return;
    setCollapsedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addCut = () => {
    setCuts((prev) => [...prev, { ...DEFAULT_CUT }]);
  };

  const removeCut = (index: number) => {
    setCuts((prev) => prev.filter((_, idx) => idx !== index));
    setCollapsedCuts((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleClearCut = (index: number) => {
    setCuts((prev) =>
      prev.map((cut, idx) => (idx === index ? { ...DEFAULT_CUT } : cut))
    );
    setCutValidationErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setSavedCuts((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleClearAll = () => {
    if (cuts.length === 0) return;
    setCuts([{ ...DEFAULT_CUT }]);
    setCutValidationErrors({});
    setSavedCuts(new Set());
    setCollapsedCuts(new Set());
  };

  return {
    collapsedCuts,
    savedCuts,
    setSavedCuts,
    cutValidationErrors,
    setCutValidationErrors,
    openPriorityDropdown,
    setOpenPriorityDropdown,
    toggleCut,
    addCut,
    removeCut,
    handleClearCut,
    handleClearAll,
  };
};
