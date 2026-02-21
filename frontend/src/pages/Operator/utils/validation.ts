import type { CutInputData, QuantityInputData } from "../types/cutInput";

const parseDateTimeToTimestamp = (value: string): number | null => {
  const trimmed = value.trim();
  const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
  if (!dateTimeRegex.test(trimmed)) return null;
  const [datePart, timePart] = trimmed.split(" ");
  const [dayStr, monthStr, yearStr] = datePart.split("/");
  const [hourStr, minuteStr] = timePart.split(":");
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const parsed = new Date(year, month - 1, day, hour, minute).getTime();
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

/**
 * Validate quantity input data and return errors
 */
export const validateQuantityInputs = (qtyData: QuantityInputData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!qtyData.startTime || !qtyData.startTime.trim()) {
    errors.startTime = "Start Time is required.";
  } else {
    // Validate date/time format (DD/MM/YYYY HH:mm)
    const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    if (!dateTimeRegex.test(qtyData.startTime.trim())) {
      errors.startTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
    }
  }
  
  if (!qtyData.endTime || !qtyData.endTime.trim()) {
    errors.endTime = "End Time is required.";
  } else {
    // Validate date/time format (DD/MM/YYYY HH:mm)
    const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
    if (!dateTimeRegex.test(qtyData.endTime.trim())) {
      errors.endTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
    }
  }

  const startTs = qtyData.startTime ? parseDateTimeToTimestamp(qtyData.startTime) : null;
  const endTs = qtyData.endTime ? parseDateTimeToTimestamp(qtyData.endTime) : null;
  if (startTs !== null && endTs !== null && endTs <= startTs) {
    errors.endTime = "End Time must be after Start Time.";
  }
  
  if (!qtyData.machineNumber || !qtyData.machineNumber.trim()) {
    errors.machineNumber = "Machine Number is required.";
  }
  
  if (!qtyData.opsName || qtyData.opsName.length === 0) {
    errors.opsName = "At least one Operator Name is required.";
  }
  
  // Machine Hrs is auto-calculated, so we check if it's valid
  if (!qtyData.machineHrs || parseFloat(qtyData.machineHrs) < 0) {
    errors.machineHrs = "Please enter valid Start Time and End Time.";
  }
  
  return errors;
};

export const validateRangeSelection = (
  totalQuantity: number,
  fromQty: number,
  toQty: number
): string | null => {
  if (!Number.isFinite(fromQty) || !Number.isFinite(toQty)) {
    return "Enter valid quantity range.";
  }
  if (toQty <= 1) {
    return "To Qty must be greater than 1.";
  }
  if (fromQty < 1 || toQty < 1 || fromQty > totalQuantity || toQty > totalQuantity) {
    return `Range must be between 1 and ${totalQuantity}.`;
  }
  if (fromQty > toQty) {
    return "From Qty cannot be greater than To Qty.";
  }
  return null;
};

/**
 * Validate cut input data (at least one quantity must be filled) and return errors
 */
export const validateCutInputs = (cutData: CutInputData): Record<string, Record<string, string>> => {
  const errors: Record<string, Record<string, string>> = {};
  
  if (!cutData.quantities || cutData.quantities.length === 0) {
    errors[0] = { general: "At least one quantity input is required." };
    return errors;
  }
  
  // Check if at least one quantity has all required fields filled
  const hasAtLeastOneValidQuantity = cutData.quantities.some((qtyData) => {
    const qtyErrors = validateQuantityInputs(qtyData);
    return Object.keys(qtyErrors).length === 0;
  });
  
  // If no quantity is fully filled, we don't require all to be filled
  // Only validate quantities that have some data entered
  cutData.quantities.forEach((qtyData, index) => {
    // Only validate if this quantity has at least one field filled
    const hasAnyData = qtyData.startTime || qtyData.endTime || qtyData.machineNumber || 
                       (qtyData.opsName && qtyData.opsName.length > 0);
    
    if (hasAnyData) {
      const qtyErrors = validateQuantityInputs(qtyData);
      if (Object.keys(qtyErrors).length > 0) {
        errors[index] = qtyErrors;
      }
    }
  });
  
  // If at least one quantity is valid, allow submission even if others are incomplete
  if (hasAtLeastOneValidQuantity && Object.keys(errors).length > 0) {
    // Clear errors for quantities that aren't being submitted
    // Only keep errors for quantities that have partial data
    const filteredErrors: Record<string, Record<string, string>> = {};
    Object.keys(errors).forEach((key) => {
      const qtyData = cutData.quantities[parseInt(key)];
      const hasAnyData = qtyData.startTime || qtyData.endTime || qtyData.machineNumber || 
                         (qtyData.opsName && qtyData.opsName.length > 0);
      // Only include errors for quantities with partial data (user started filling but didn't complete)
      if (hasAnyData) {
        filteredErrors[key] = errors[key];
      }
    });
    return filteredErrors;
  }
  
  return errors;
};
