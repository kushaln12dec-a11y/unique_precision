import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { useOperatorViewData } from "./hooks/useOperatorViewData";
import { useOperatorInputs } from "./hooks/useOperatorInputs";
import { useOperatorSubmit } from "./hooks/useOperatorSubmit";
import { OperatorJobInfo } from "./components/OperatorJobInfo";
import { OperatorCutCard } from "./components/OperatorCutCard";
import { OperatorTotalsSection } from "./components/OperatorTotalsSection";
import { calculateTotals, type CutForm } from "../Programmer/programmerUtils";
import type { CutInputData } from "./types/cutInput";
import { createEmptyCutInputData } from "./types/cutInput";
import { getUsers } from "../../services/userApi";
import { startOperatorProductionLog } from "../../services/employeeLogsApi";
import { captureOperatorInput, updateOperatorQaStatus } from "../../services/operatorApi";
import { validateQuantityInputs, validateRangeSelection } from "./utils/validation";
import { getQuantityProgressStatuses } from "./utils/qaProgress";
import type { QuantityQaStatus } from "../../types/job";
import { getUserRoleFromToken } from "../../utils/auth";
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
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  
  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, Record<string, string>>>>(new Map());
  const [operatorUsers, setOperatorUsers] = useState<Array<{ id: string | number; name: string }>>([]);
  const [savedQuantities, setSavedQuantities] = useState<Map<number | string, Set<number>>>(new Map());
  const [savedRanges, setSavedRanges] = useState<Map<number | string, Set<string>>>(new Map());
  const [qaStatusesByCut, setQaStatusesByCut] = useState<Map<number | string, Record<number, QuantityQaStatus>>>(new Map());
  const [activeOperatorLogIds, setActiveOperatorLogIds] = useState<Map<string, string>>(new Map());

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
  const [pendingDispatch, setPendingDispatch] = useState<{ cutId: number | string; quantityNumbers: number[] } | null>(null);
  const [pendingReset, setPendingReset] = useState<{ cutId: number | string; quantityIndex: number } | null>(null);

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

  useEffect(() => {
    if (!jobs.length) {
      setSavedQuantities(new Map());
      return;
    }
    const seeded = new Map<number | string, Set<number>>();
    jobs.forEach((job) => {
      const qty = Math.max(1, Number(job.qty || 1));
      const statuses = getQuantityProgressStatuses(job, qty);
      const saved = new Set<number>();
      statuses.forEach((status, idx) => {
        if (status !== "EMPTY") saved.add(idx);
      });
      if (saved.size > 0) {
        seeded.set(job.id, saved);
      }
    });
    setSavedQuantities((prev) => {
      const merged = new Map(prev);
      seeded.forEach((set, cutId) => {
        const existing = merged.get(cutId) || new Set<number>();
        set.forEach((idx) => existing.add(idx));
        merged.set(cutId, existing);
      });
      return merged;
    });
  }, [jobs]);

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
        operatorLogId: activeOperatorLogIds.get(`${String(cutId)}:${quantityIndex}`) || undefined,
      };

      try {
        await captureOperatorInput(String(cutId), payload);
      } catch (error: any) {
        if (error?.message?.includes("overlaps")) {
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
            existing[quantityIndex + 1] = existing[quantityIndex + 1] || "SAVED";
            next.set(cutId, existing);
            return next;
          });
          return;
        }
        throw error;
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
      setActiveOperatorLogIds((prev) => {
        const next = new Map(prev);
        next.delete(`${String(cutId)}:${quantityIndex}`);
        return next;
      });
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
        operatorLogId: activeOperatorLogIds.get(`${String(cutId)}:${sourceQuantityIndex}`) || undefined,
      };

      try {
        await captureOperatorInput(String(cutId), payload);
      } catch (error: any) {
        if (error?.message?.includes("overlaps")) {
          setSaveToast({
            message: "Selected quantity/range already has captured data. Once captured, it cannot be replaced.",
            variant: "error",
            visible: true,
          });
          setTimeout(() => setSaveToast((prev) => ({ ...prev, visible: false })), 3000);
          return;
        }
        throw error;
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
      setActiveOperatorLogIds((prev) => {
        const next = new Map(prev);
        next.delete(`${String(cutId)}:${sourceQuantityIndex}`);
        return next;
      });
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

  const pendingDispatchJob = pendingDispatch
    ? jobs.find((job) => String(job.id) === String(pendingDispatch.cutId))
    : null;

  const handleStartTimeCaptured = async (cutId: number | string, quantityIndex: number) => {
    const key = `${String(cutId)}:${quantityIndex}`;
    if (activeOperatorLogIds.has(key)) return;

    const job = jobs.find((item) => String(item.id) === String(cutId));
    if (!job) return;

    try {
      const fromQty = quantityIndex + 1;
      const startedLog = await startOperatorProductionLog({
        jobId: String(job.id),
        jobGroupId: Number(job.groupId || 0),
        refNumber: String((job as any).refNumber || ""),
        customer: job.customer || "",
        description: job.description || "",
        settingLabel: String(job.setting || ""),
        fromQty,
        toQty: fromQty,
        quantityCount: 1,
        startedAt: new Date().toISOString(),
      });

      if (startedLog?._id) {
        setActiveOperatorLogIds((prev) => {
          const next = new Map(prev);
          next.set(key, startedLog._id);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to start operator production log", error);
    }
  };

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
                        onSendToQa={(cutId, quantityNumbers) => {
                          if (!quantityNumbers.length) return;
                          setPendingDispatch({ cutId, quantityNumbers });
                        }}
                        savedQuantities={saved}
                        savedRanges={savedRangeSet}
                        validationErrors={errors}
                        onShowToast={(message, variant = "info") => {
                          setActionToast({ message, variant, visible: true });
                          setTimeout(() => {
                            setActionToast((prev) => ({ ...prev, visible: false }));
                          }, 2000);
                        }}
                        onRequestResetTimer={(cutId, quantityIndex) => {
                          setPendingReset({ cutId, quantityIndex });
                        }}
                        onStartTimeCaptured={handleStartTimeCaptured}
                        isAdmin={isAdmin}
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
                isAdmin={isAdmin}
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
      {pendingDispatch && (
        <ConfirmDeleteModal
          title="Confirm Dispatch"
          message="Are you sure you want to dispatch selected quantity to QA?"
          details={[
            { label: "Setting", value: pendingDispatchJob ? String(jobs.findIndex((j) => String(j.id) === String(pendingDispatch.cutId)) + 1) : "N/A" },
            { label: "Quantities", value: pendingDispatch.quantityNumbers.join(", ") },
          ]}
          confirmButtonText="Dispatch To QA"
          onConfirm={async () => {
            await handleUpdateQaStatus(pendingDispatch.cutId, pendingDispatch.quantityNumbers, "SENT_TO_QA");
            setPendingDispatch(null);
          }}
          onCancel={() => setPendingDispatch(null)}
        />
      )}
      {pendingReset && (
        <ConfirmDeleteModal
          title="Confirm Reset"
          message="Are you sure you want to reset this quantity timer?"
          details={[
            { label: "Setting", value: String(jobs.findIndex((j) => String(j.id) === String(pendingReset.cutId)) + 1) },
            { label: "Quantity", value: String(pendingReset.quantityIndex + 1) },
          ]}
          confirmButtonText="Reset Timer"
          onConfirm={() => {
            handleInputChange(pendingReset.cutId, pendingReset.quantityIndex, "resetTimer", "");
            setPendingReset(null);
          }}
          onCancel={() => setPendingReset(null)}
        />
      )}
    </div>
  );
};

export default OperatorViewPage;
