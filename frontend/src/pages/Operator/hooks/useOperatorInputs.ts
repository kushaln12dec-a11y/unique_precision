import type { CutInputData } from "../types/cutInput";
import { createEmptyCutInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";

/**
 * Hook for managing operator input changes and calculations
 */
export const useOperatorInputs = (
  _cutInputs: Map<number | string, CutInputData>,
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>,
  idleTimeConfigs: Map<string, number>,
  validationErrors: Map<number | string, Record<string, string>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, string>>>>
) => {
  const handleCutImageChange = async (cutId: number | string, files: File[]) => {
    if (files.length === 0) {
      setCutInputs((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(cutId) || createEmptyCutInputData();
        newMap.set(cutId, {
          ...current,
          lastImage: null,
          lastImageFile: null,
        });
        return newMap;
      });
      return;
    }

    // For operator, we only use the first image
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setCutInputs((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(cutId) || createEmptyCutInputData();
        newMap.set(cutId, {
          ...current,
          lastImage: reader.result as string,
          lastImageFile: file,
        });
        return newMap;
      });
    };
    reader.readAsDataURL(file);
  };

  type InputField = keyof CutInputData | "recalculateMachineHrs";

  const handleInputChange = (cutId: number | string, field: InputField, value: string) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(cutId) || createEmptyCutInputData();
      
      const updatedData = {
        ...current,
        ...(field !== "recalculateMachineHrs" ? { [field]: value } : {}),
      };

      // If idleTime is changed to "Vertical Dial" and config exists, set duration
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        // Format as HH:MM (00:20 for 20 minutes)
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      
      // 🔄 ONLY recalc when icon is clicked
      if (field === "recalculateMachineHrs") {
        if (updatedData.startTime && updatedData.endTime) {
          updatedData.machineHrs = calculateMachineHrs(
            updatedData.startTime,
            updatedData.endTime,
            updatedData.idleTimeDuration || ""
          );
        }
      }
      
      newMap.set(cutId, updatedData);
      
      // Clear error for this field when user starts typing
      if (field !== "recalculateMachineHrs" && validationErrors.has(cutId)) {
        const errors = validationErrors.get(cutId)!;
        if (errors[field]) {
          setValidationErrors((prev) => {
            const newErrors = new Map(prev);
            const cutErrors = { ...errors };
            delete cutErrors[field];
            if (Object.keys(cutErrors).length === 0) {
              newErrors.delete(cutId);
            } else {
              newErrors.set(cutId, cutErrors);
            }
            return newErrors;
          });
        }
      }
      
      return newMap;
    });
  };

  return {
    handleCutImageChange,
    handleInputChange,
  };
};
