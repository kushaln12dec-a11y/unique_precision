import type { CutInputData } from "../types/cutInput";

/**
 * Validate cut input data and return errors
 */
export const validateCutInputs = (cutData: CutInputData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!cutData.startTime || !cutData.startTime.trim()) {
    errors.startTime = "Start Time is required.";
  } else {
    // Validate date/time format (DD/MM/YYYY HH:mm)
    const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    if (!dateTimeRegex.test(cutData.startTime.trim())) {
      errors.startTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
    }
  }
  
  if (!cutData.endTime || !cutData.endTime.trim()) {
    errors.endTime = "End Time is required.";
  } else {
    // Validate date/time format (DD/MM/YYYY HH:mm)
    const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    if (!dateTimeRegex.test(cutData.endTime.trim())) {
      errors.endTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
    }
  }
  
  if (!cutData.machineNumber || !cutData.machineNumber.trim()) {
    errors.machineNumber = "Machine Number is required.";
  }
  
  if (!cutData.opsName || !cutData.opsName.trim()) {
    errors.opsName = "Operator Name is required.";
  }
  
  // Machine Hrs is auto-calculated, so we check if it's valid
  if (!cutData.machineHrs || parseFloat(cutData.machineHrs) < 0) {
    errors.machineHrs = "Please enter valid Start Time and End Time.";
  }
  
  return errors;
};
