import type { CutForm } from "../programmerUtils";

/**
 * Validate cut form data
 */
export const validateCut = (cut: CutForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!cut.customer) errors.customer = "Customer is required.";
  if (!cut.rate) errors.rate = "Rate is required.";
  if (!cut.cut) errors.cut = "Cut length is required.";
  if (!cut.thickness) errors.thickness = "Thickness is required.";
  if (!cut.passLevel) errors.passLevel = "Pass is required.";
  if (!cut.setting) errors.setting = "Setting level is required.";
  if (!cut.qty) errors.qty = "Quantity is required.";
  if (!cut.priority) errors.priority = "Priority is required.";
  if (!cut.description.trim()) errors.description = "Description is required.";
  if (cut.sedm === "Yes" && !cut.sedmLengthValue) {
    errors.sedmLengthValue = "SEDM length is required when SEDM is Yes.";
  }
  return errors;
};
