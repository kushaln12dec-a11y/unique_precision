import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyCutInputData, createEmptyQuantityInputData } from "../types/cutInput";
import { calculateMachineHrs } from "../utils/machineHrsCalculation";

/**
 * Hook for managing operator input changes and calculations
 */
export const useOperatorInputs = (
  _cutInputs: Map<number | string, CutInputData>,
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>,
  idleTimeConfigs: Map<string, number>,
  validationErrors: Map<number | string, Record<string, Record<string, string>>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>
) => {
  const handleCutImageChange = async (cutId: number | string, files: File[]) => {
    if (files.length === 0) {
      setCutInputs((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(cutId);
        if (!current) return newMap;
        
        // Update first quantity's lastImage - handle backward compatibility
        const quantities = Array.isArray(current.quantities) ? current.quantities : [];
        const updatedQuantities = quantities.length > 0 ? [...quantities] : [createEmptyQuantityInputData()];
        if (updatedQuantities.length > 0) {
          updatedQuantities[0] = {
            ...updatedQuantities[0],
            lastImage: null,
            lastImageFile: null,
          };
        }
        
        newMap.set(cutId, {
          ...current,
          quantities: updatedQuantities,
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
        const current = newMap.get(cutId) || createEmptyCutInputData(1);
        
        // Update first quantity's lastImage - handle backward compatibility
        const quantities = Array.isArray(current.quantities) ? current.quantities : [];
        const updatedQuantities = quantities.length > 0 ? [...quantities] : [createEmptyQuantityInputData()];
        if (updatedQuantities.length > 0) {
          updatedQuantities[0] = {
            ...updatedQuantities[0],
            lastImage: reader.result as string,
            lastImageFile: file,
          };
        }
        
        newMap.set(cutId, {
          ...current,
          quantities: updatedQuantities,
        });
        return newMap;
      });
    };
    reader.readAsDataURL(file);
  };

  type InputField = keyof QuantityInputData | "recalculateMachineHrs" | "addIdleTimeToMachineHrs";

  const handleInputChange = (
    cutId: number | string,
    quantityIndex: number,
    field: InputField,
    value: string | string[]
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      let current = newMap.get(cutId);
      
      // Handle backward compatibility - ensure we have a valid CutInputData with quantities array
      if (!current || !Array.isArray(current.quantities)) {
        current = createEmptyCutInputData(Math.max(1, quantityIndex + 1));
        newMap.set(cutId, current);
      }
      
      // Ensure we have enough quantities
      const quantities = [...current.quantities];
      while (quantities.length <= quantityIndex) {
        quantities.push(createEmptyQuantityInputData());
      }
      
      const qtyData = quantities[quantityIndex];
      const updatedQtyData: QuantityInputData = {
        ...qtyData,
        ...(field !== "recalculateMachineHrs" && field !== "addIdleTimeToMachineHrs" ? { [field]: value } : {}),
      } as QuantityInputData;

      // If idleTime is changed to "Vertical Dial" and config exists, set duration
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedQtyData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      
      // Auto-calculate machine hours when start time or end time changes
      if (field === "startTime" || field === "endTime") {
        if (updatedQtyData.startTime && updatedQtyData.endTime) {
          updatedQtyData.machineHrs = calculateMachineHrs(
            updatedQtyData.startTime,
            updatedQtyData.endTime,
            ""
          );
        }
      }
      
      // Add idle time to machine hours when icon is clicked
      if (field === "addIdleTimeToMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime && updatedQtyData.idleTimeDuration) {
          // Calculate base machine hours
          const baseMachineHrs = calculateMachineHrs(
            updatedQtyData.startTime,
            updatedQtyData.endTime,
            ""
          );
          
          // Parse idle time duration (HH:MM format)
          const idleParts = updatedQtyData.idleTimeDuration.split(":");
          if (idleParts.length === 2) {
            const idleHours = parseInt(idleParts[0], 10) || 0;
            const idleMinutes = parseInt(idleParts[1], 10) || 0;
            const idleTimeInHours = idleHours + idleMinutes / 60;
            
            // Add idle time to machine hours
            const totalMachineHrs = parseFloat(baseMachineHrs) + idleTimeInHours;
            updatedQtyData.machineHrs = totalMachineHrs.toFixed(3);
          }
        }
      }
      
      // Recalculate machine hours when icon is clicked (legacy support)
      if (field === "recalculateMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime) {
          updatedQtyData.machineHrs = calculateMachineHrs(
            updatedQtyData.startTime,
            updatedQtyData.endTime,
            updatedQtyData.idleTimeDuration || ""
          );
        }
      }
      
      quantities[quantityIndex] = updatedQtyData;
      
      newMap.set(cutId, {
        ...current,
        quantities,
      });
      
      // Clear error for this field when user starts typing
      if (field !== "recalculateMachineHrs" && validationErrors.has(cutId)) {
        const cutErrors = validationErrors.get(cutId)!;
        if (cutErrors[quantityIndex]?.[field]) {
          setValidationErrors((prev) => {
            const newErrors = new Map(prev);
            const qtyErrors = { ...cutErrors[quantityIndex] };
            delete qtyErrors[field];
            const updatedCutErrors = {
              ...cutErrors,
              [quantityIndex]: qtyErrors,
            };
            if (Object.keys(qtyErrors).length === 0) {
              const { [quantityIndex]: _, ...rest } = updatedCutErrors;
              if (Object.keys(rest).length === 0) {
                newErrors.delete(cutId);
              } else {
                newErrors.set(cutId, rest);
              }
            } else {
              newErrors.set(cutId, updatedCutErrors);
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
