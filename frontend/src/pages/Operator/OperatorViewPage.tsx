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
import type { CutInputData, QuantityInputData } from "./types/cutInput";
import { createEmptyCutInputData } from "./types/cutInput";
import { getUsers } from "../../services/userApi";
import { captureOperatorInput } from "../../services/operatorApi";
import { validateQuantityInputs } from "./utils/validation";
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

  const { handleCutImageChange, handleInputChange } = useOperatorInputs(
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
      await captureOperatorInput(String(cutId), {
        startTime: qtyData.startTime,
        endTime: qtyData.endTime,
        machineHrs: qtyData.machineHrs,
        machineNumber: qtyData.machineNumber,
        opsName: opsName,
        idleTime: qtyData.idleTime || "",
        idleTimeDuration: qtyData.idleTimeDuration || "",
        lastImage: imageBase64,
        quantityIndex: quantityIndex, // Include quantity index for backend tracking
      });

      // Mark this quantity as saved
      setSavedQuantities((prev) => {
        const newMap = new Map(prev);
        const saved = newMap.get(cutId) || new Set<number>();
        saved.add(quantityIndex);
        newMap.set(cutId, saved);
        return newMap;
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
                        onSaveQuantity={handleSaveQuantity}
                        savedQuantities={saved}
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
