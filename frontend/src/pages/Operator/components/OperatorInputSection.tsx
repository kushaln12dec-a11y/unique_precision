import React from "react";
import DateTimeInput from "./DateTimeInput";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import { MultiSelectOperators } from "./MultiSelectOperators";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { decimalHoursToHHMM } from "../utils/machineHrsCalculation";
import { useQuantityTimer } from "../hooks/useQuantityTimer";
import "../OperatorViewPage.css";

type InputField = keyof QuantityInputData | "recalculateMachineHrs" | "addIdleTimeToMachineHrs";

type OperatorInputSectionProps = {
  cutData: CutInputData;
  cutId: number | string;
  quantity: number;
  operatorUsers: Array<{ id: string | number; name: string }>;
  onInputChange: (
    cutId: number | string,
    quantityIndex: number,
    field: InputField,
    value: string | string[]
  ) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  savedQuantities?: Set<number>; // Track which quantities are saved
  validationErrors?: Record<string, Record<string, string>>; // quantityIndex -> field -> error
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
};

export const OperatorInputSection: React.FC<OperatorInputSectionProps> = ({
  cutData,
  cutId,
  quantity,
  operatorUsers,
  onInputChange,
  onSaveQuantity,
  savedQuantities = new Set(),
  validationErrors = {},
  onShowToast,
}) => {
  // Ensure we have the right number of quantity inputs
  const quantities = cutData.quantities || [];
  const displayQuantities = Array.from({ length: Math.max(quantity, quantities.length) }, (_, i) => 
    quantities[i] || {
      startTime: "",
      endTime: "",
      machineHrs: "",
      machineNumber: "",
      opsName: [],
      idleTime: "",
      idleTimeDuration: "",
      lastImage: null,
      lastImageFile: null,
    }
  );

  return (
    <div className="operator-cut-inputs-section" data-cut-id={cutId}>
      <h5 className="operator-inputs-title">Input Values</h5>
      
      {displayQuantities.map((qtyData, qtyIndex) => {
        const { elapsedTime, isRunning } = useQuantityTimer(qtyData.startTime, qtyData.endTime);
        
        return (
          <div key={qtyIndex} className="quantity-input-group">
            <div className="quantity-header">
              <h6 className="quantity-label">Quantity {qtyIndex + 1}</h6>
              {qtyData.startTime && (
                <div className="quantity-timer">
                  <span className="timer-label">Running Time:</span>
                  <span className={`timer-value ${isRunning ? "running" : ""}`}>
                    {elapsedTime}
                  </span>
                </div>
              )}
            </div>
            <div className="operator-inputs-grid">
            <div className="operator-input-card">
              <label>Start Time</label>
              <DateTimeInput
                value={qtyData.startTime}
                onChange={(value) => onInputChange(cutId, qtyIndex, "startTime", value)}
                onTimeCapture={() => {
                  // Timer will automatically start when startTime is set
                  if (onShowToast) {
                    onShowToast("Start time captured successfully!", "success");
                  }
                }}
                placeholder="DD/MM/YYYY HH:MM"
                error={validationErrors[qtyIndex]?.startTime}
              />
            </div>
            <div className="operator-input-card">
              <label>End Time</label>
              <DateTimeInput
                value={qtyData.endTime}
                onChange={(value) => {
                  onInputChange(cutId, qtyIndex, "endTime", value);
                  // Auto-calculate machine hours when end time is set
                  if (qtyData.startTime && value) {
                    // Trigger recalculation
                    setTimeout(() => {
                      onInputChange(cutId, qtyIndex, "recalculateMachineHrs", "");
                    }, 100);
                  }
                }}
                onTimeCapture={() => {
                  if (onShowToast) {
                    onShowToast("End time captured successfully!", "success");
                  }
                }}
                placeholder="DD/MM/YYYY HH:MM"
                error={validationErrors[qtyIndex]?.endTime}
              />
            </div>
            <div className="operator-input-card">
              <label>Machine Hrs</label>
              <input
                type="text"
                value={
                  qtyData.machineHrs
                    ? decimalHoursToHHMM(parseFloat(qtyData.machineHrs))
                    : "00:00"
                }
                readOnly
                placeholder="00:00"
                className="readonly-input machine-hrs-input"
              />
              {validationErrors[qtyIndex]?.machineHrs && (
                <p className="field-error">{validationErrors[qtyIndex].machineHrs}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Mach #</label>
              <input
                type="text"
                value={qtyData.machineNumber}
                onChange={(e) =>
                  onInputChange(cutId, qtyIndex, "machineNumber", e.target.value)
                }
                placeholder="Machine Number"
                className={validationErrors[qtyIndex]?.machineNumber ? "input-error" : ""}
              />
              {validationErrors[qtyIndex]?.machineNumber && (
                <p className="field-error">{validationErrors[qtyIndex].machineNumber}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Ops Name</label>
              <MultiSelectOperators
                selectedOperators={qtyData.opsName || []}
                availableOperators={operatorUsers}
                onChange={(operators) => onInputChange(cutId, qtyIndex, "opsName", operators)}
                placeholder="Select operators..."
                className={validationErrors[qtyIndex]?.opsName ? "input-error" : ""}
              />
              {validationErrors[qtyIndex]?.opsName && (
                <p className="field-error">{validationErrors[qtyIndex].opsName}</p>
              )}
            </div>
            <div className="operator-input-card">
              <label>Idle Time</label>
              <select
                value={qtyData.idleTime}
                onChange={(e) => onInputChange(cutId, qtyIndex, "idleTime", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Power Break">Power Break</option>
                <option value="Machine Breakdown">Machine Breakdown</option>
                <option value="Vertical Dial">Vertical Dial</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Consumables Change">Consumables Change</option>
              </select>
            </div>
            {qtyData.idleTime && (
              <div className="operator-input-card">
                <label>Idle Time Duration</label>
                <div className="idle-time-duration-wrapper">
                  <input
                    type="text"
                    value={qtyData.idleTimeDuration}
                    onChange={(e) =>
                      onInputChange(cutId, qtyIndex, "idleTimeDuration", e.target.value)
                    }
                    placeholder={qtyData.idleTime === "Vertical Dial" ? "00:20" : "HH:MM"}
                    readOnly={qtyData.idleTime === "Vertical Dial"}
                    className={qtyData.idleTime === "Vertical Dial" ? "readonly-input" : ""}
                  />
                  {qtyData.idleTimeDuration && (
                    <>
                      <button
                        type="button"
                        className="idle-time-add-icon"
                        onClick={() => {
                          onInputChange(cutId, qtyIndex, "addIdleTimeToMachineHrs", "");
                          if (onShowToast) {
                            onShowToast("Idle time added to machine hours!", "success");
                          }
                        }}
                        aria-label="Add idle time to machine hours"
                        title="Add idle time to machine hours"
                      >
                        <AddIcon fontSize="small" />
                      </button>
                      <button
                        type="button"
                        className="idle-time-reset-icon"
                        onClick={() => onInputChange(cutId, qtyIndex, "idleTimeDuration", "")}
                        aria-label="Clear idle time duration"
                        title="Clear idle time duration"
                      >
                        <ClearIcon fontSize="small" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Save Button for this Quantity */}
          {onSaveQuantity && (
            <div className="quantity-save-section">
              <button
                type="button"
                className={`btn-save-quantity ${savedQuantities.has(qtyIndex) ? "saved" : ""}`}
                onClick={() => onSaveQuantity(cutId, qtyIndex)}
              >
                {savedQuantities.has(qtyIndex) ? "✓ Saved" : "Save Quantity " + (qtyIndex + 1)}
              </button>
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
};
