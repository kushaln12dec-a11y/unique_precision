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
  type InputField = keyof QuantityInputData | "recalculateMachineHrs" | "addIdleTimeToMachineHrs" | "togglePause" | "resetTimer" | "pauseReason";

  const copyQuantityToAll = (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      let current = newMap.get(cutId);

      if (!current || !Array.isArray(current.quantities)) {
        current = createEmptyCutInputData(Math.max(1, totalQuantity));
      }

      const quantities = [...current.quantities];
      while (quantities.length < totalQuantity) {
        quantities.push(createEmptyQuantityInputData());
      }

      const source = quantities[sourceQuantityIndex];
      if (!source) {
        return newMap;
      }

      const copiedFields = {
        startTime: source.startTime,
        startTimeEpochMs: source.startTimeEpochMs || null,
        endTime: source.endTime,
        endTimeEpochMs: source.endTimeEpochMs || null,
        machineHrs: source.machineHrs,
        machineNumber: source.machineNumber,
        opsName: [...(source.opsName || [])],
        idleTime: source.idleTime,
        idleTimeDuration: source.idleTimeDuration,
        lastImage: source.lastImage,
        lastImageFile: source.lastImageFile,
      };

      for (let i = 0; i < totalQuantity; i += 1) {
        quantities[i] = {
          ...quantities[i],
          ...copiedFields,
          // Each quantity keeps independent timer/pause state
          isPaused: false,
          pauseStartTime: null,
          totalPauseTime: 0,
          pausedElapsedTime: 0,
          pauseSessions: [],
          currentPauseReason: "",
        };
      }

      newMap.set(cutId, {
        ...current,
        quantities,
      });

      // Clear field-level validation errors after mass apply.
      if (setValidationErrors) {
        setValidationErrors((prevErrors) => {
          const updated = new Map(prevErrors);
          updated.delete(cutId);
          return updated;
        });
      }

      return newMap;
    });
  };

  const copyQuantityToCount = (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number,
    quantityCount: number
  ) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      let current = newMap.get(cutId);

      if (!current || !Array.isArray(current.quantities)) {
        current = createEmptyCutInputData(Math.max(1, totalQuantity));
      }

      const quantities = [...current.quantities];
      while (quantities.length < totalQuantity) {
        quantities.push(createEmptyQuantityInputData());
      }

      const source = quantities[sourceQuantityIndex];
      if (!source) {
        return newMap;
      }

      const safeCount = Math.max(1, Math.floor(quantityCount));
      const targetEndIndex = Math.min(totalQuantity, sourceQuantityIndex + safeCount);

      const copiedFields = {
        startTime: source.startTime,
        startTimeEpochMs: source.startTimeEpochMs || null,
        endTime: source.endTime,
        endTimeEpochMs: source.endTimeEpochMs || null,
        machineHrs: source.machineHrs,
        machineNumber: source.machineNumber,
        opsName: [...(source.opsName || [])],
        idleTime: source.idleTime,
        idleTimeDuration: source.idleTimeDuration,
        lastImage: source.lastImage,
        lastImageFile: source.lastImageFile,
      };

      for (let i = sourceQuantityIndex; i < targetEndIndex; i += 1) {
        quantities[i] = {
          ...quantities[i],
          ...copiedFields,
          isPaused: false,
          pauseStartTime: null,
          totalPauseTime: 0,
          pausedElapsedTime: 0,
          pauseSessions: [],
          currentPauseReason: "",
        };
      }

      newMap.set(cutId, {
        ...current,
        quantities,
      });

      if (setValidationErrors) {
        setValidationErrors((prevErrors) => {
          const updated = new Map(prevErrors);
          updated.delete(cutId);
          return updated;
        });
      }

      return newMap;
    });
  };

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

  // Helper function to parse start time string to timestamp
  const parseStartTime = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(" ");
    if (parts.length === 2) {
      const datePart = parts[0].split("/");
      const timePart = parts[1].split(":");
      if (datePart.length === 3 && timePart.length === 2) {
        const day = parseInt(datePart[0], 10) || 0;
        const month = parseInt(datePart[1], 10) || 0;
        const year = parseInt(datePart[2], 10) || 0;
        const hours = parseInt(timePart[0], 10) || 0;
        const minutes = parseInt(timePart[1], 10) || 0;
        const date = new Date(year, month - 1, day, hours, minutes);
        return date.getTime();
      }
    }
    return null;
  };

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
      
      // Handle pause/resume toggle
      if (field === "togglePause") {
        const now = Date.now();
        if (qtyData.isPaused) {
          // Resuming: calculate pause duration and add to sessions
          // Require pause reason before resuming
          if (!qtyData.currentPauseReason || qtyData.currentPauseReason.trim() === "") {
            // Show error toast if reason is not provided
            if (setValidationErrors) {
              setValidationErrors((prev) => {
                const newErrors = new Map(prev);
                const cutErrors = newErrors.get(cutId) || {};
                const qtyErrors = cutErrors[quantityIndex] || {};
                qtyErrors.pauseReason = "Please enter a pause reason before resuming";
                cutErrors[quantityIndex] = qtyErrors;
                newErrors.set(cutId, cutErrors);
                return newErrors;
              });
            }
            return newMap;
          }
          
          if (qtyData.pauseStartTime) {
            const pauseDuration = Math.floor((now - qtyData.pauseStartTime) / 1000);
            const newTotalPauseTime = qtyData.totalPauseTime + pauseDuration;
            
            // Add completed pause session to array
            const pauseSessions = [...(qtyData.pauseSessions || [])];
            pauseSessions.push({
              pauseStartTime: qtyData.pauseStartTime,
              pauseEndTime: now,
              pauseDuration: pauseDuration,
              reason: qtyData.currentPauseReason || "",
            });
            
            // Clear validation error
            if (setValidationErrors) {
              setValidationErrors((prev) => {
                const newErrors = new Map(prev);
                const cutErrors = newErrors.get(cutId) || {};
                const qtyErrors = { ...cutErrors[quantityIndex] };
                delete qtyErrors.pauseReason;
                cutErrors[quantityIndex] = qtyErrors;
                newErrors.set(cutId, cutErrors);
                return newErrors;
              });
            }
            
            const updatedQtyData: QuantityInputData = {
              ...qtyData,
              isPaused: false,
              pauseStartTime: null,
              totalPauseTime: newTotalPauseTime,
              pauseSessions: pauseSessions,
              currentPauseReason: "",
            };
            quantities[quantityIndex] = updatedQtyData;
            newMap.set(cutId, { ...current, quantities });
            return newMap;
          }
        } else {
          // Pausing: save current elapsed time and start pause timer
          // Get current elapsed time from the timer state
          // We'll calculate it based on start time and total pause time
          const startTimestamp = qtyData.startTimeEpochMs || parseStartTime(qtyData.startTime);
          let currentElapsed = qtyData.pausedElapsedTime;
          
          if (startTimestamp) {
            // Calculate current elapsed time before pausing
            const elapsedMs = now - startTimestamp - (qtyData.totalPauseTime * 1000);
            currentElapsed = Math.max(0, Math.floor(elapsedMs / 1000));
          }
          
          const updatedQtyData: QuantityInputData = {
            ...qtyData,
            isPaused: true,
            pauseStartTime: now,
            pausedElapsedTime: currentElapsed,
            currentPauseReason: "", // Will be set by user
          };
          quantities[quantityIndex] = updatedQtyData;
          newMap.set(cutId, { ...current, quantities });
          return newMap;
        }
        return newMap;
      }
      
      // Handle pause reason update
      if (field === "pauseReason") {
        const updatedQtyData: QuantityInputData = {
          ...qtyData,
          currentPauseReason: value as string,
        };
        quantities[quantityIndex] = updatedQtyData;
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      
      if (field === "startTimeEpochMs" || field === "endTimeEpochMs") {
        const parsed = typeof value === "string" && value.trim() ? Number(value) : null;
        const numericValue = Number.isFinite(parsed as number) ? (parsed as number) : null;
        const updatedQtyData: QuantityInputData = {
          ...qtyData,
          [field]: numericValue,
        } as QuantityInputData;
        quantities[quantityIndex] = updatedQtyData;
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }

      // Handle reset - reset timer, pause data, and clear start/end times to allow recalculation
      if (field === "resetTimer") {
        const updatedQtyData: QuantityInputData = {
          ...qtyData,
          startTime: "",
          startTimeEpochMs: null,
          endTime: "",
          endTimeEpochMs: null,
          machineHrs: "",
          isPaused: false,
          pauseStartTime: null,
          totalPauseTime: 0,
          pausedElapsedTime: 0,
          pauseSessions: [],
          currentPauseReason: "",
        };
        quantities[quantityIndex] = updatedQtyData;
        newMap.set(cutId, { ...current, quantities });
        return newMap;
      }
      
      // Handle end time - can only be set once
      if (field === "endTime" && qtyData.endTime) {
        // End time already set, don't allow changes
        return newMap;
      }
      
      const updatedQtyData: QuantityInputData = {
        ...qtyData,
        ...(field !== "recalculateMachineHrs" && field !== "addIdleTimeToMachineHrs" ? { [field]: value } : {}),
      } as QuantityInputData;

      if (field === "startTime") {
        updatedQtyData.startTimeEpochMs = null;
      }
      if (field === "endTime") {
        updatedQtyData.endTimeEpochMs = null;
      }

      // If idleTime is changed to "Vertical Dial" and config exists, set duration
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedQtyData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      
      // Auto-calculate machine hours when start time or end time changes
      // Account for pause time in calculation
      if (field === "startTime" || field === "endTime") {
        if (field === "endTime" && typeof value === "string" && value && qtyData.isPaused && qtyData.pauseStartTime) {
          const now = Date.now();
          const pauseDuration = Math.max(0, Math.floor((now - qtyData.pauseStartTime) / 1000));
          const pauseSessions = [...(qtyData.pauseSessions || [])];
          pauseSessions.push({
            pauseStartTime: qtyData.pauseStartTime,
            pauseEndTime: now,
            pauseDuration,
            reason: (qtyData.currentPauseReason || "").trim() || "Ended while paused",
          });

          updatedQtyData.isPaused = false;
          updatedQtyData.pauseStartTime = null;
          updatedQtyData.totalPauseTime = (qtyData.totalPauseTime || 0) + pauseDuration;
          updatedQtyData.pauseSessions = pauseSessions;
          updatedQtyData.currentPauseReason = "";
        }

        if (updatedQtyData.startTime && updatedQtyData.endTime) {
          const baseMachineHrs = calculateMachineHrs(
            updatedQtyData.startTime,
            updatedQtyData.endTime,
            ""
          );
          // Subtract pause time from machine hours
          const pauseTimeInHours = (updatedQtyData.totalPauseTime || 0) / 3600;
          const adjustedMachineHrs = Math.max(0, parseFloat(baseMachineHrs) - pauseTimeInHours);
          updatedQtyData.machineHrs = adjustedMachineHrs.toFixed(3);
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
      // Account for pause time in calculation
      if (field === "recalculateMachineHrs") {
        if (updatedQtyData.startTime && updatedQtyData.endTime) {
          const baseMachineHrs = calculateMachineHrs(
            updatedQtyData.startTime,
            updatedQtyData.endTime,
            updatedQtyData.idleTimeDuration || ""
          );
          // Subtract pause time from machine hours
          const pauseTimeInHours = (updatedQtyData.totalPauseTime || 0) / 3600;
          const adjustedMachineHrs = Math.max(0, parseFloat(baseMachineHrs) - pauseTimeInHours);
          updatedQtyData.machineHrs = adjustedMachineHrs.toFixed(3);
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
        if (cutErrors && cutErrors[String(quantityIndex)]?.[field]) {
          setValidationErrors((prev) => {
            const newErrors = new Map(prev);
            const qtyErrors = { ...cutErrors[String(quantityIndex)] };
            delete qtyErrors[field];
            const updatedCutErrors: Record<string, Record<string, string>> = {
              ...cutErrors,
              [String(quantityIndex)]: qtyErrors,
            };
            if (Object.keys(qtyErrors).length === 0) {
              const { [String(quantityIndex)]: _, ...rest } = updatedCutErrors;
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
    copyQuantityToAll,
    copyQuantityToCount,
  };
};
