import { useMemo, useState } from "react";
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
import { createEmptyCutInputData } from "./types/cutInput";
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
  
  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, string>>>(new Map());

  const {
    jobs,
    idleTimeConfigs,
    cutInputs,
    setCutInputs,
    expandedCuts,
    toggleCutExpansion,
  } = useOperatorViewData(groupId, cutIdParam);

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
    toggleCutExpansion,
    setValidationErrors
  );

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

  const getCutInputData = (cutId: number | string): CutInputData => {
    return cutInputs.get(cutId) || createEmptyCutInputData();
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
                    Viewing Cut {jobs.findIndex((j) => String(j.id) === String(cutIdParam)) + 1}
                  </span>
                )}
              </div>

              {/* Job Information Section */}
              <OperatorJobInfo parentJob={parentJob} groupId={groupId} />

              {/* Cuts Information Section */}
              <div className="operator-cuts-section">
                <h3 className="operator-section-title">Cuts ({jobs.length})</h3>
                <div className="operator-cuts-container">
                  {jobs.map((cutItem, index) => {
                    const cutData = getCutInputData(cutItem.id);
                    const isExpanded = expandedCuts.has(cutItem.id);
                    const errors = validationErrors.get(cutItem.id as number) || {};
                    
                    return (
                      <OperatorCutCard
                        key={cutItem.id}
                        cutItem={cutItem}
                        index={index}
                        cutData={cutData}
                        isExpanded={isExpanded}
                        onToggleExpansion={() => toggleCutExpansion(cutItem.id)}
                        onImageChange={(files) => handleCutImageChange(cutItem.id, files)}
                        onInputChange={handleInputChange}
                        validationErrors={errors}
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
    </div>
  );
};

export default OperatorViewPage;
