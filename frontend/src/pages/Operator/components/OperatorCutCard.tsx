import React from "react";
import ImageUpload from "../../Programmer/components/ImageUpload";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { OperatorInputSection } from "./OperatorInputSection";
import { estimatedHoursFromAmount, formatEstimatedTime } from "../../../utils/jobFormatting";
import "../OperatorViewPage.css";

import type { QuantityProgressStatus } from "../utils/qaProgress";
import type { OperatorInputField } from "../types/inputFields";
import { calculateTotals, getThicknessDisplayValue } from "../../Programmer/programmerUtils";

type OperatorCutCardProps = {
  cutItem: JobEntry;
  index: number;
  cutData: CutInputData;
  isExpanded: boolean;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  onToggleExpansion: () => void;
  onImageChange: (files: File[]) => void;
  onInputChange: (
    cutId: number | string,
    quantityIndex: number,
    field: OperatorInputField,
    value: string | string[]
  ) => void;
  onApplyToAllQuantities: (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number
  ) => void;
  onApplyToCountQuantities: (
    cutId: number | string,
    sourceQuantityIndex: number,
    totalQuantity: number,
    quantityCount: number
  ) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  onSaveRange?: (
    cutId: number | string,
    sourceQuantityIndex: number,
    fromQty: number,
    toQty: number
  ) => void;
  qaStatuses?: Record<number, QuantityProgressStatus>;
  onSendToQa?: (cutId: number | string, quantityNumbers: number[]) => void;
  savedQuantities?: Set<number>;
  savedRanges?: Set<string>;
  validationErrors?: Record<string, Record<string, string>>;
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  onRequestShiftOver?: (cutId: number | string, quantityIndex: number) => void;
  onStartTimeCaptured?: (cutId: number | string, quantityIndex: number) => void;
  isAdmin: boolean;
};

export const OperatorCutCard: React.FC<OperatorCutCardProps> = ({
  cutItem,
  index,
  cutData,
  isExpanded,
  operatorUsers,
  machineOptions,
  onToggleExpansion,
  onImageChange,
  onInputChange,
  onApplyToAllQuantities,
  onApplyToCountQuantities,
  onSaveQuantity,
  onSaveRange,
  qaStatuses = {},
  onSendToQa,
  savedQuantities = new Set(),
  savedRanges = new Set(),
  validationErrors = {},
  onShowToast,
  onRequestResetTimer,
  onRequestShiftOver,
  onStartTimeCaptured,
  isAdmin,
}) => {
  const quantity = Number(cutItem.qty || 1);
  const cutEstimatedHrs = estimatedHoursFromAmount(calculateTotals(cutItem as any).wedmAmount);
  const expectedHoursPerQuantity = cutEstimatedHrs / Math.max(1, quantity);
  return (
    <div className="operator-cut-card">
      <div className="operator-cut-header" onClick={onToggleExpansion}>
        <h4>Setting {index + 1}</h4>
        <div className="cut-expand-indicator">{isExpanded ? "▼" : "▶"}</div>
      </div>

      {isExpanded && (
        <>
          <div className="operator-cut-details-section">
            <div className="operator-cut-details-grid">
              <div className="cut-detail-item"><label>Customer</label><span>{cutItem.customer || "-"}</span></div>
              {isAdmin && <div className="cut-detail-item"><label>Rate (Rs./hr)</label><span>Rs. {Number(cutItem.rate || 0).toFixed(2)}</span></div>}
              <div className="cut-detail-item"><label>Description</label><span>{cutItem.description || "-"}</span></div>
              <div className="cut-detail-item"><label>Material</label><span>{cutItem.material || "-"}</span></div>
              <div className="cut-detail-item"><label>Program Ref File Name</label><span>{(cutItem as any).programRefFile || "-"}</span></div>
              <div className="cut-detail-item"><label>Cut Length (mm)</label><span>{Number(cutItem.cut || 0).toFixed(2)}</span></div>
              <div className="cut-detail-item"><label>TH (MM)</label><span>{getThicknessDisplayValue(cutItem.thickness)}</span></div>
              <div className="cut-detail-item"><label>Pass</label><span>{cutItem.passLevel || "-"}</span></div>
              <div className="cut-detail-item"><label>Setting</label><span>{cutItem.setting || "-"}</span></div>
              <div className="cut-detail-item"><label>Quantity</label><span>{Number(cutItem.qty || 0)}</span></div>
              <div className="cut-detail-item"><label>SEDM</label><span>{cutItem.sedm || "-"}</span></div>
              <div className="cut-detail-item"><label>PIP Finish</label><span className={cutItem.pipFinish ? "pip-badge yes" : "pip-badge no"}>{cutItem.pipFinish ? "Yes" : "No"}</span></div>
              <div className="cut-detail-item"><label>Complex</label><span className={cutItem.critical ? "complex-badge yes" : "complex-badge no"}>{cutItem.critical ? "Yes" : "No"}</span></div>
              <div className="cut-detail-item"><label>Priority</label><span className={`priority-badge priority-${(cutItem.priority || "").toLowerCase()}`}>{cutItem.priority || "-"}</span></div>
              <div className="cut-detail-item"><label>Estimated Time</label><span>{formatEstimatedTime(cutEstimatedHrs)}</span></div>
              {isAdmin && (
                <div className="cut-detail-item">
                  <label>Total Amount (Rs.)</label>
                  <span>Rs. {cutItem.totalAmount ? cutItem.totalAmount.toFixed(2) : "0.00"}</span>
                </div>
              )}
            </div>

            <div className="operator-cut-image-section">
              <label>Last Image (Cut {index + 1})</label>
              <ImageUpload
                images={
                  cutData.quantities && cutData.quantities.length > 0 && cutData.quantities[0].lastImage
                    ? [cutData.quantities[0].lastImage]
                    : (Array.isArray(cutItem.cutImage) ? cutItem.cutImage : (cutItem.cutImage ? [cutItem.cutImage] : []))
                }
                label={`Setting ${index + 1} Last Image`}
                onImageChange={onImageChange}
                onRemove={(imageIndex) => {
                  if (imageIndex === 0) {
                    onImageChange([]);
                  }
                }}
                readOnly={true}
              />
            </div>
          </div>

          <OperatorInputSection
            cutData={cutData}
            cutId={cutItem.id}
            quantity={quantity}
            requiredHoursPerQuantity={expectedHoursPerQuantity}
            operatorUsers={operatorUsers}
            machineOptions={machineOptions}
            isAdmin={isAdmin}
            onInputChange={onInputChange}
            onApplyToAllQuantities={onApplyToAllQuantities}
            onApplyToCountQuantities={onApplyToCountQuantities}
            onSaveQuantity={onSaveQuantity}
            onSaveRange={onSaveRange}
            qaStatuses={qaStatuses}
            onSendToQa={onSendToQa}
            savedQuantities={savedQuantities}
            savedRanges={savedRanges}
            validationErrors={validationErrors}
            onShowToast={onShowToast}
            onRequestResetTimer={onRequestResetTimer}
            onRequestShiftOver={onRequestShiftOver}
            onStartTimeCaptured={onStartTimeCaptured}
          />
        </>
      )}
    </div>
  );
};
