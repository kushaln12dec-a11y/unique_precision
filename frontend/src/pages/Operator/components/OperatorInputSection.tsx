import React from "react";
import DateTimeInput from "./DateTimeInput";
import ClearIcon from "@mui/icons-material/Clear";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import type { CutInputData } from "../types/cutInput";
import { decimalHoursToHHMM } from "../utils/machineHrsCalculation";
import "../OperatorViewPage.css";


type InputField = keyof CutInputData | "recalculateMachineHrs";

type OperatorInputSectionProps = {
  cutData: CutInputData;
  cutId: number | string;
  onInputChange: (
    cutId: number | string,
    field: InputField,
    value: string
  ) => void;
  validationErrors?: Record<string, string>;
};

export const OperatorInputSection: React.FC<OperatorInputSectionProps> = ({
  cutData,
  cutId,
  onInputChange,
  validationErrors = {},
}) => {
  return (
    <div className="operator-cut-inputs-section" data-cut-id={cutId}>
      <h5 className="operator-inputs-title">Input Values</h5>
      <div className="operator-inputs-grid">
        <div className="operator-input-card">
          <label>Start Time</label>
          <DateTimeInput
            value={cutData.startTime}
            onChange={(value) => onInputChange(cutId, "startTime", value)}
            placeholder="DD/MM/YYYY HH:MM"
            error={validationErrors.startTime}
          />
        </div>
        <div className="operator-input-card">
          <label>End Time</label>
          <DateTimeInput
            value={cutData.endTime}
            onChange={(value) => onInputChange(cutId, "endTime", value)}
            placeholder="DD/MM/YYYY HH:MM"
            error={validationErrors.endTime}
          />
        </div>
        <div className="operator-input-card">
          <label>Machine Hrs</label>
          <div className="machine-hrs-wrapper">
            <input
              type="text"
              value={
                cutData.machineHrs
                  ? decimalHoursToHHMM(parseFloat(cutData.machineHrs))
                  : "00:00"
              }
              readOnly
              placeholder="00:00"
              className="readonly-input"
            />
            <button
              type="button"
              className="machine-hrs-recalc-icon"
              onClick={() => onInputChange(cutId, "recalculateMachineHrs", "")}
              aria-label="Recalculate Machine Hours"
              title="Recalculate Machine Hours"
            >
              <AutorenewIcon fontSize="small" />
            </button>
          </div>
          {validationErrors.machineHrs && (
            <p className="field-error">{validationErrors.machineHrs}</p>
          )}
        </div>
        <div className="operator-input-card">
          <label>Mach #</label>
          <input
            type="text"
            value={cutData.machineNumber}
            onChange={(e) =>
              onInputChange(cutId, "machineNumber", e.target.value)
            }
            placeholder="Machine Number"
            className={validationErrors.machineNumber ? "input-error" : ""}
          />
          {validationErrors.machineNumber && (
            <p className="field-error">{validationErrors.machineNumber}</p>
          )}
        </div>
        <div className="operator-input-card">
          <label>Ops Name</label>
          <input
            type="text"
            value={cutData.opsName}
            onChange={(e) => onInputChange(cutId, "opsName", e.target.value)}
            placeholder="Operator Name"
            className={validationErrors.opsName ? "input-error" : ""}
          />
          {validationErrors.opsName && (
            <p className="field-error">{validationErrors.opsName}</p>
          )}
        </div>
        <div className="operator-input-card">
          <label>Idle Time</label>
          <select
            value={cutData.idleTime}
            onChange={(e) => onInputChange(cutId, "idleTime", e.target.value)}
          >
            <option value="">Select</option>
            <option value="Power Break">Power Break</option>
            <option value="Machine Breakdown">Machine Breakdown</option>
            <option value="Vertical Dial">Vertical Dial</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Consumables Change">Consumables Change</option>
          </select>
        </div>
        {cutData.idleTime && (
          <div className="operator-input-card">
            <label>Idle Time Duration</label>
            <div className="idle-time-duration-wrapper">
              <input
                type="text"
                value={cutData.idleTimeDuration}
                onChange={(e) =>
                  onInputChange(cutId, "idleTimeDuration", e.target.value)
                }
                placeholder={cutData.idleTime === "Vertical Dial" ? "00:20" : "HH:MM"}
                readOnly={cutData.idleTime === "Vertical Dial"}
                className={cutData.idleTime === "Vertical Dial" ? "readonly-input" : ""}
              />
              {cutData.idleTimeDuration && (
                <button
                  type="button"
                  className="idle-time-reset-icon"
                  onClick={() => onInputChange(cutId, "idleTimeDuration", "")}
                  aria-label="Clear idle time duration"
                  title="Clear idle time duration"
                >
                  <ClearIcon fontSize="small" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
