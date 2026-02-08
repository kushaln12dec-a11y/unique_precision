import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { captureOperatorInput } from "../../../services/operatorApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { validateCutInputs } from "../utils/validation";

/**
 * Hook for handling operator form submission
 */
export const useOperatorSubmit = (
  groupId: string | null,
  jobs: JobEntry[],
  cutInputs: Map<number | string, CutInputData>,
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

    // Validate all cuts and collect errors
    const newErrors = new Map<number | string, Record<string, Record<string, string>>>();
    let hasErrors = false;

    for (const job of jobs) {
      const cutData = cutInputs.get(job.id as number);
      if (cutData) {
        const errors = validateCutInputs(cutData);
        if (Object.keys(errors).length > 0) {
          newErrors.set(job.id as number, errors);
          hasErrors = true;
          // Expand the cut if it has errors
          setExpandedCuts((prev) => {
            const newSet = new Set(prev);
            newSet.add(job.id as number);
            return newSet;
          });
        }
      }
    }

    if (hasErrors) {
      setValidationErrors(newErrors);
      // Scroll to first error
      const firstErrorCut = jobs.find((job) => newErrors.has(job.id as number));
      if (firstErrorCut) {
        const element = document.querySelector(`[data-cut-id="${firstErrorCut.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    // Clear errors if validation passes
    setValidationErrors(new Map());

    try {
      const updatePromises: Promise<any>[] = [];

      for (const job of jobs) {
        const cutData = cutInputs.get(job.id as number);
        if (cutData && cutData.quantities && cutData.quantities.length > 0) {
          // Find the first valid quantity (one that has all required fields filled)
          const validQty = cutData.quantities.find((qty) => {
            return qty.startTime && qty.endTime && qty.machineNumber && 
                   qty.opsName && qty.opsName.length > 0;
          });
          
          // If no fully valid quantity, skip this job (validation should have caught this)
          if (!validQty) continue;
          
          // Submit the first valid quantity's data
          const firstQty = validQty;
          
          let imageBase64 = firstQty.lastImage;
          if (firstQty.lastImageFile) {
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
              reader.onloadend = () => {
                imageBase64 = reader.result as string;
                resolve();
              };
              reader.onerror = reject;
              reader.readAsDataURL(firstQty.lastImageFile!);
            });
          }

          // Join operator names with comma for backward compatibility
          const opsName = Array.isArray(firstQty.opsName) 
            ? firstQty.opsName.join(", ") 
            : (firstQty.opsName || "");

          updatePromises.push(
            captureOperatorInput(String(job.id), {
              startTime: firstQty.startTime,
              endTime: firstQty.endTime,
              machineHrs: firstQty.machineHrs,
              machineNumber: firstQty.machineNumber,
              opsName: opsName,
              idleTime: firstQty.idleTime || "",
              idleTimeDuration: firstQty.idleTimeDuration || "",
              lastImage: imageBase64,
              quantityIndex: cutData.quantities.indexOf(firstQty), // Track which quantity was submitted
            })
          );
        }
      }

      await Promise.all(updatePromises);
      setToast({ message: "Job details updated successfully!", variant: "success", visible: true });
      setTimeout(() => {
        setToast({ message: "", variant: "success", visible: false });
        navigate("/operator");
      }, 2000);
    } catch (error) {
      console.error("Failed to update jobs", error);
      setToast({ message: "Failed to update job details. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast({ message: "", variant: "error", visible: false }), 3000);
    }
  };

  return {
    handleSubmit,
    toast,
    setToast,
  };
};
