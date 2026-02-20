import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import { useOperatorViewData } from "./hooks/useOperatorViewData";
import { useOperatorInputs } from "./hooks/useOperatorInputs";
import { useOperatorSubmit } from "./hooks/useOperatorSubmit";
import { OperatorJobInfo } from "./components/OperatorJobInfo";
import { OperatorCutCard } from "./components/OperatorCutCard";
import { OperatorTotalsSection } from "./components/OperatorTotalsSection";
import { calculateTotals, type CutForm } from "../Programmer/programmerUtils";
import type { CutInputData } from "./types/cutInput";
import type { JobEntry } from "../../types/job";
import { createEmptyCutInputData } from "./types/cutInput";
import { getUsers } from "../../services/userApi";
import { captureOperatorInput, updateOperatorQaStatus } from "../../services/operatorApi";
import { validateQuantityInputs, validateRangeSelection } from "./utils/validation";
import { getQaProgressCounts, getQuantityProgressStatuses } from "./utils/qaProgress";
import type { QuantityQaStatus } from "../../types/job";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "../Programmer/components/JobDetailsModal.css";
import "./OperatorViewPage.css";
import "./components/DateTimeInput.css";

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const cutIdParam = searchParams.get("cutId");
  
  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, Record<string, string>>>>(new Map());
  const [operatorUsers, setOperatorUsers] = useState<Array<{ id: string | number; name: string }>>([]);
  const [savedQuantities, setSavedQuantities] = useState<Map<number | string, Set<number>>>(new Map());
  const [savedRanges, setSavedRanges] = useState<Map<number | string, Set<string>>>(new Map());
  const [qaStatusesByCut, setQaStatusesByCut] = useState<Map<number | string, Record<number, QuantityQaStatus>>>(new Map());

  const {
    jobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    setExpandedCuts,
    toggleCutExpansion,
  } = useOperatorViewData(groupId, cutIdParam);

  // Fetch operator users
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const userList = await getUsers();
        const operators = userList
          .filter((user) => user.role === "OPERATOR" || user.role === "ADMIN")
          .map((user) => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          }));
        setOperatorUsers(operators);
      } catch (error) {
        console.error("Failed to fetch operators", error);
      }
    };
    fetchOperators();
  }, []);

  const { handleCutImageChange, handleInputChange, copyQuantityToAll, copyQuantityToCount } = useOperatorInputs(
    cutInputs,
    setCutInputs,
    idleTimeConfigs,
    validationErrors,
    setValidationErrors
  );

  const { handleSubmit, toast, setToast } = useOperatorSubmit(
    groupId,
    jobs,
    cutInputs,
    setExpandedCuts,
    setValidationErrors
  );

  const [saveToast, setSaveToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });

  const [actionToast, setActionToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });

  useEffect(() => {
    if (!jobs.length) return;
    setQaStatusesByCut((prev) => {
      const next = new Map(prev);
      jobs.forEach((job) => {
        const qty = Math.max(1, Number(job.qty || 1));
        const statuses = getQuantityProgressStatuses(job, qty);
        const mapped: Record<number, QuantityQaStatus> = {};
        statuses.forEach((status, idx) => {
          if (status !== "EMPTY") mapped[idx + 1] = status;
        });
        if (!next.has(job.id)) {
          next.set(job.id, mapped);
        }
      });
      return next;
    });
  }, [jobs]);

  const getJobWithCurrentQaStates = (job: JobEntry): JobEntry => {
    const currentQa = qaStatusesByCut.get(job.id);
    if (!currentQa) return job;
    const normalized: Record<string, QuantityQaStatus> = {};
    Object.entries(currentQa).forEach(([qty, status]) => {
      normalized[String(qty)] = status;
    });
    return { ...job, quantityQaStates: normalized };
  };

  const handleSaveQuantity = async (cutId: number | string, quantityIndex: number) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData || !cutData.quantities || !cutData.quantities[quantityIndex]) {
      setSaveToast({ message: "No data to save for this quantity.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
      return;
    }

    const qtyData = cutData.quantities[quantityIndex];
    
    // Validate this quantity
    const errors = validateQuantityInputs(qtyData);
    
    if (Object.keys(errors).length > 0) {
      // Set validation errors for this quantity
      setValidationErrors((prev) => {
        const newErrors = new Map(prev);
        const cutErrors = newErrors.get(cutId) || {};
        newErrors.set(cutId, {
          ...cutErrors,
          [quantityIndex]: errors,
        });
        return newErrors;
      });
      setSaveToast({ message: "Please fix validation errors before saving.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
      return;
    }

    try {
      // Convert image file to base64 if needed
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => {
            imageBase64 = reader.result as string;
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(qtyData.lastImageFile!);
        });
      }

      // Join operator names with comma for backward compatibility
      const opsName = Array.isArray(qtyData.opsName) 
        ? qtyData.opsName.join(", ") 
        : (qtyData.opsName || "");

      // Save this quantity's data
      const payload = {
        startTime: qtyData.startTime,
        endTime: qtyData.endTime,
        machineHrs: qtyData.machineHrs,
        machineNumber: qtyData.machineNumber,
        opsName: opsName,
        idleTime: qtyData.idleTime || "",
        idleTimeDuration: qtyData.idleTimeDuration || "",
        lastImage: imageBase64,
        quantityIndex: quantityIndex,
        captureMode: "SINGLE" as const,
        fromQty: quantityIndex + 1,
        toQty: quantityIndex + 1,
      };

      try {
        await captureOperatorInput(String(cutId), payload);
      } catch (error: any) {
        if (error?.message?.includes("overlaps")) {
          const shouldOverwrite = window.confirm("This quantity already has captured data. Replace it?");
          if (!shouldOverwrite) return;
          await captureOperatorInput(String(cutId), {
            ...payload,
            overwriteExisting: true,
          });
        } else {
          throw error;
        }
      }

      // Mark this quantity as saved
      setSavedQuantities((prev) => {
        const newMap = new Map(prev);
        const saved = newMap.get(cutId) || new Set<number>();
        saved.add(quantityIndex);
        newMap.set(cutId, saved);
        return newMap;
      });
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        const existing = { ...(next.get(cutId) || {}) };
        existing[quantityIndex + 1] = "SAVED";
        next.set(cutId, existing);
        return next;
      });

      // Clear validation errors for this quantity
      setValidationErrors((prev) => {
        const newErrors = new Map(prev);
        const cutErrors = newErrors.get(cutId);
        if (cutErrors) {
          const { [quantityIndex]: _, ...rest } = cutErrors;
          if (Object.keys(rest).length === 0) {
            newErrors.delete(cutId);
          } else {
            newErrors.set(cutId, rest);
          }
        }
        return newErrors;
      });

      setSaveToast({ message: `Quantity ${quantityIndex + 1} saved successfully!`, variant: "success", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 2000);
    } catch (error) {
      console.error("Failed to save quantity", error);
      setSaveToast({ message: "Failed to save quantity. Please try again.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
    }
  };

  const handleSaveRange = async (
    cutId: number | string,
    sourceQuantityIndex: number,
    fromQty: number,
    toQty: number
  ) => {
    const cutData = cutInputs.get(cutId);
    if (!cutData || !cutData.quantities || !cutData.quantities[sourceQuantityIndex]) {
      setSaveToast({ message: "No data to save for selected range.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
      return;
    }

    const job = jobs.find((item) => String(item.id) === String(cutId));
    const totalQuantity = Math.max(1, Number(job?.qty || 1));
    const rangeError = validateRangeSelection(totalQuantity, fromQty, toQty);
    if (rangeError) {
      setSaveToast({ message: rangeError, variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
      return;
    }

    const qtyData = cutData.quantities[sourceQuantityIndex];
    const errors = validateQuantityInputs(qtyData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => {
        const newErrors = new Map(prev);
        const cutErrors = newErrors.get(cutId) || {};
        newErrors.set(cutId, {
          ...cutErrors,
          [sourceQuantityIndex]: errors,
        });
        return newErrors;
      });
      setSaveToast({ message: "Please fix validation errors before saving range.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
      return;
    }

    try {
      let imageBase64 = qtyData.lastImage;
      if (qtyData.lastImageFile) {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => {
            imageBase64 = reader.result as string;
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(qtyData.lastImageFile!);
        });
      }

      const opsName = Array.isArray(qtyData.opsName)
        ? qtyData.opsName.join(", ")
        : (qtyData.opsName || "");

      const payload = {
        startTime: qtyData.startTime,
        endTime: qtyData.endTime,
        machineHrs: qtyData.machineHrs,
        machineNumber: qtyData.machineNumber,
        opsName,
        idleTime: qtyData.idleTime || "",
        idleTimeDuration: qtyData.idleTimeDuration || "",
        lastImage: imageBase64,
        quantityIndex: sourceQuantityIndex,
        captureMode: "RANGE" as const,
        fromQty,
        toQty,
      };

      try {
        await captureOperatorInput(String(cutId), payload);
      } catch (error: any) {
        if (error?.message?.includes("overlaps")) {
          const shouldOverwrite = window.confirm("Selected range overlaps existing capture. Replace overlapping entries?");
          if (!shouldOverwrite) return;
          await captureOperatorInput(String(cutId), {
            ...payload,
            overwriteExisting: true,
          });
        } else {
          throw error;
        }
      }

      setSavedRanges((prev) => {
        const newMap = new Map(prev);
        const saved = newMap.get(cutId) || new Set<string>();
        saved.add(`${fromQty}-${toQty}`);
        newMap.set(cutId, saved);
        return newMap;
      });

      setSaveToast({ message: `Range ${fromQty}-${toQty} saved successfully!`, variant: "success", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 2000);
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        const existing = { ...(next.get(cutId) || {}) };
        for (let qty = fromQty; qty <= toQty; qty += 1) {
          existing[qty] = "SAVED";
        }
        next.set(cutId, existing);
        return next;
      });
    } catch (error) {
      console.error("Failed to save range", error);
      setSaveToast({ message: "Failed to save range. Please try again.", variant: "error", visible: true });
      setTimeout(() => setSaveToast({ ...saveToast, visible: false }), 3000);
    }
  };

  const handleUpdateQaStatus = async (
    cutId: number | string,
    quantityNumbers: number[],
    status: QuantityQaStatus
  ) => {
    if (!quantityNumbers.length) return;
    try {
      await updateOperatorQaStatus(String(cutId), {
        quantityNumbers,
        status: status === "SENT_TO_QA" ? "SENT_TO_QA" : "READY_FOR_QA",
      });
      setQaStatusesByCut((prev) => {
        const next = new Map(prev);
        const existing = { ...(next.get(cutId) || {}) };
        quantityNumbers.forEach((qty) => {
          existing[qty] = status;
        });
        next.set(cutId, existing);
        return next;
      });
      const label = status === "SENT_TO_QA" ? "Sent to QA" : "Marked Ready for QA";
      setActionToast({ message: `${label}: Qty ${quantityNumbers.join(", ")}`, variant: "success", visible: true });
      setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 2500);
    } catch (error) {
      console.error("Failed to update QA status", error);
      setActionToast({ message: "Failed to update QA status.", variant: "error", visible: true });
      setTimeout(() => {
        setActionToast((prev) => ({ ...prev, visible: false }));
      }, 2500);
    }
  };

  const amounts = useMemo(() => {
    if (jobs.length === 0) return { perCut: [], totalWedmAmount: 0, totalSedmAmount: 0 };
    const totals = jobs.map((entry) => calculateTotals(entry as CutForm));
    const totalWedmAmount = totals.reduce((sum, t) => sum + t.wedmAmount, 0);
    const totalSedmAmount = totals.reduce((sum, t) => sum + t.sedmAmount, 0);
    return {
      perCut: totals.map((t) => ({ wedmAmount: t.wedmAmount, sedmAmount: t.sedmAmount })),
      totalWedmAmount,
      totalSedmAmount,
    };
  }, [jobs]);

  const parentJob = jobs.length > 0 ? jobs[0] : null;
  const groupTotalHrs = jobs.reduce((sum, job) => sum + (job.totalHrs || 0), 0);
  const groupTotalAmount = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);

  const getCutInputData = (cutId: number | string, quantity: number = 1): CutInputData => {
    return cutInputs.get(cutId) || createEmptyCutInputData(quantity);
  };

  const overallQaCounts = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        const qty = Math.max(1, Number(job.qty || 1));
        const counts = getQaProgressCounts(getJobWithCurrentQaStates(job), qty);
        acc.saved += counts.saved;
        acc.ready += counts.ready;
        acc.sent += counts.sent;
        acc.empty += counts.empty;
        return acc;
      },
      { saved: 0, ready: 0, sent: 0, empty: 0 }
    );
  }, [jobs, qaStatusesByCut]);

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          {jobs.length > 0 && parentJob && (
            <>
              {/* Page Heading */}
              <div className="operator-page-heading">
                <h2>Job Details - {parentJob.customer || "N/A"}</h2>
                {cutIdParam && (
                  <span className="cut-indicator">
                    Viewing Setting {jobs.findIndex((j) => String(j.id) === String(cutIdParam)) + 1}
                  </span>
                )}
              </div>

              {/* Job Information Section */}
              <OperatorJobInfo parentJob={parentJob} groupId={groupId} />
              <div className="qa-overall-summary">
                <span className="qa-summary-chip saved">Operation Logged: {overallQaCounts.saved}</span>
                <span className="qa-summary-chip ready">Inspection Ready: {overallQaCounts.ready}</span>
                <span className="qa-summary-chip sent">QA Dispatched: {overallQaCounts.sent}</span>
                <span className="qa-summary-chip empty">Pending Input: {overallQaCounts.empty}</span>
              </div>
              <div className="qa-stage-legend">
                <span className="qa-legend-title">Stage Legend:</span>
                <span className="qa-legend-item saved">Operation Logged = input captured</span>
                <span className="qa-legend-item ready">Inspection Ready = selected for QA review</span>
                <span className="qa-legend-item sent">QA Dispatched = moved to QA queue</span>
                <span className="qa-legend-item empty">Pending Input = values not entered yet</span>
              </div>

              {/* Cuts Information Section */}
              <div className="operator-cuts-section">
                <h3 className="operator-section-title">Settings ({jobs.length})</h3>
                <div className="operator-cuts-container">
                  {jobs.map((cutItem, index) => {
                    const quantity = Number(cutItem.qty || 1);
                    const cutData = getCutInputData(cutItem.id, quantity);
                    const isExpanded = expandedCuts.has(cutItem.id);
                    const errors = validationErrors.get(cutItem.id as number) || {};
                    const saved = savedQuantities.get(cutItem.id) || new Set<number>();
                    const savedRangeSet = savedRanges.get(cutItem.id) || new Set<string>();
                    const qaStatuses = qaStatusesByCut.get(cutItem.id) || {};
                    
                    return (
                      <OperatorCutCard
                        key={cutItem.id}
                        cutItem={cutItem}
                        index={index}
                        cutData={cutData}
                        isExpanded={isExpanded}
                        operatorUsers={operatorUsers}
                        onToggleExpansion={() => toggleCutExpansion(cutItem.id)}
                        onImageChange={(files) => handleCutImageChange(cutItem.id, files)}
                        onInputChange={handleInputChange}
                        onApplyToAllQuantities={copyQuantityToAll}
                        onApplyToCountQuantities={copyQuantityToCount}
                        onSaveQuantity={handleSaveQuantity}
                        onSaveRange={handleSaveRange}
                        qaStatuses={qaStatuses}
                        onMarkReadyForQa={(cutId, quantityNumbers) =>
                          handleUpdateQaStatus(cutId, quantityNumbers, "READY_FOR_QA")
                        }
                        onSendToQa={(cutId, quantityNumbers) =>
                          handleUpdateQaStatus(cutId, quantityNumbers, "SENT_TO_QA")
                        }
                        savedQuantities={saved}
                        savedRanges={savedRangeSet}
                        validationErrors={errors}
                        onShowToast={(message, variant = "info") => {
                          setActionToast({ message, variant, visible: true });
                          setTimeout(() => {
                            setActionToast((prev) => ({ ...prev, visible: false }));
                          }, 2000);
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Totals Section */}
              <OperatorTotalsSection
                groupTotalHrs={groupTotalHrs}
                totalWedmAmount={amounts.totalWedmAmount}
                totalSedmAmount={amounts.totalSedmAmount}
                groupTotalAmount={groupTotalAmount}
              />

              {/* Action Buttons */}
              <div className="operator-view-actions">
                <button className="btn-secondary" onClick={() => navigate("/operator")}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSubmit}>
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      <Toast
        message={saveToast.message}
        visible={saveToast.visible}
        variant={saveToast.variant}
        onClose={() => setSaveToast({ ...saveToast, visible: false })}
      />
      <Toast
        message={actionToast.message}
        visible={actionToast.visible}
        variant={actionToast.variant}
        onClose={() => setActionToast({ ...actionToast, visible: false })}
      />
    </div>
  );
};

export default OperatorViewPage;
