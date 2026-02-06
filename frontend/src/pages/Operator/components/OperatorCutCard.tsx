import React from "react";
import ImageUpload from "../../Programmer/components/ImageUpload";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { OperatorInputSection } from "./OperatorInputSection";
import "../OperatorViewPage.css";

type InputField = keyof CutInputData | "recalculateMachineHrs";

type OperatorCutCardProps = {
  cutItem: JobEntry;
  index: number;
  cutData: CutInputData;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onImageChange: (files: File[]) => void;
  onInputChange: (cutId: number | string, field: InputField, value: string) => void;
  validationErrors?: Record<string, string>;
};

export const OperatorCutCard: React.FC<OperatorCutCardProps> = ({
  cutItem,
  index,
  cutData,
  isExpanded,
  onToggleExpansion,
  onImageChange,
  onInputChange,
  validationErrors = {},
}) => {
  return (
    <div className="operator-cut-card">
      <div 
        className="operator-cut-header"
        onClick={onToggleExpansion}
      >
        <h4>Cut {index + 1}</h4>
        <div className="cut-expand-indicator">
          {isExpanded ? "▼" : "▶"}
        </div>
      </div>
      
      {isExpanded && (
        <>
          {/* Cut Details */}
          <div className="operator-cut-details-section">
            <div className="operator-cut-details-grid">
              <div className="cut-detail-item">
                <label>Customer</label>
                <span>{cutItem.customer || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Rate (₹/hr)</label>
                <span>₹{Number(cutItem.rate || 0).toFixed(2)}</span>
              </div>
              <div className="cut-detail-item">
                <label>Description</label>
                <span>{cutItem.description || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Cut Length (mm)</label>
                <span>{Number(cutItem.cut || 0).toFixed(2)}</span>
              </div>
              <div className="cut-detail-item">
                <label>TH (MM)</label>
                <span>{Number(cutItem.thickness || 0).toFixed(2)}</span>
              </div>
              <div className="cut-detail-item">
                <label>Pass</label>
                <span>{cutItem.passLevel || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Setting</label>
                <span>{cutItem.setting || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Quantity</label>
                <span>{Number(cutItem.qty || 0)}</span>
              </div>
              <div className="cut-detail-item">
                <label>SEDM</label>
                <span>{cutItem.sedm || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Material</label>
                <span>{cutItem.material || "—"}</span>
              </div>
              <div className="cut-detail-item">
                <label>PIP Finish</label>
                <span className={cutItem.pipFinish ? "pip-badge yes" : "pip-badge no"}>
                  {cutItem.pipFinish ? "Yes" : "No"}
                </span>
              </div>
              <div className="cut-detail-item">
                <label>Complex</label>
                <span className={cutItem.critical ? "complex-badge yes" : "complex-badge no"}>
                  {cutItem.critical ? "Yes" : "No"}
                </span>
              </div>
              <div className="cut-detail-item">
                <label>Priority</label>
                <span className={`priority-badge priority-${(cutItem.priority || "").toLowerCase()}`}>
                  {cutItem.priority || "—"}
                </span>
              </div>
              <div className="cut-detail-item">
                <label>Total Hrs/Piece</label>
                <span>{cutItem.totalHrs ? cutItem.totalHrs.toFixed(3) : "0.000"}</span>
              </div>
              <div className="cut-detail-item">
                <label>Total Amount (₹)</label>
                <span>₹{cutItem.totalAmount ? cutItem.totalAmount.toFixed(2) : "0.00"}</span>
              </div>
            </div>
            
            {/* Cut-specific Image Upload */}
            <div className="operator-cut-image-section">
              <label>Last Image (Cut {index + 1})</label>
              <ImageUpload
                images={cutData.lastImage ? [cutData.lastImage] : (Array.isArray(cutItem.cutImage) ? cutItem.cutImage : (cutItem.cutImage ? [cutItem.cutImage] : []))}
                label={`Cut ${index + 1} Last Image`}
                onImageChange={onImageChange}
                onRemove={(imageIndex) => {
                  // For operator, we only allow one image, so removing means clearing
                  if (imageIndex === 0) {
                    onImageChange([]);
                  }
                }}
                readOnly={true}
              />
            </div>
          </div>

          {/* Input Fields for this Cut */}
          <OperatorInputSection
            cutData={cutData}
            cutId={cutItem.id}
            onInputChange={onInputChange}
            validationErrors={validationErrors}
          />
        </>
      )}
    </div>
  );
};
