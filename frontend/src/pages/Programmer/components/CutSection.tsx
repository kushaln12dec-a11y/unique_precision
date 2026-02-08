import React from "react";
import type { CutForm } from "../programmerUtils";
import { DustbinIcon } from "../../../utils/icons";
import ImageUpload from "./ImageUpload";
import { FormInput } from "./FormInput";
import CustomerAutocomplete from "./CustomerAutocomplete";
import MaterialAutocomplete from "./MaterialAutocomplete";
import FlagIcon from "@mui/icons-material/Flag";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";

type CutTotals = {
  totalHrs: number;
  totalAmount: number;
};

type CutSectionProps = {
  cut: CutForm;
  index: number;
  cutTotals: CutTotals;
  isCollapsed: boolean;
  isSaved: boolean;
  fieldErrors: Record<string, string>;
  isFirstCut: boolean;
  openPriorityDropdown: number | null;
  onToggle: () => void;
  onCutChange: <K extends keyof CutForm>(
    field: K
  ) => (value: CutForm[K]) => void;
  onImageChange: (files: File[]) => void;
  onRemoveImage: (imageIndex: number) => void;
  onSedmChange: (value: CutForm["sedm"]) => void;
  onSaveCut: () => void;
  onClearCut: () => void;
  onRemoveCut: () => void;
  onPriorityDropdownToggle: () => void;
  onSedmModalOpen: () => void;
  isAdmin: boolean;
};

export const CutSection: React.FC<CutSectionProps> = ({
  cut,
  index,
  cutTotals,
  isCollapsed,
  isSaved,
  fieldErrors: _fieldErrors,
  isFirstCut,
  openPriorityDropdown,
  onToggle,
  onCutChange,
  onImageChange,
  onRemoveImage,
  onSedmChange,
  onSaveCut,
  onClearCut,
  onRemoveCut,
  onPriorityDropdownToggle,
  onSedmModalOpen,
  isAdmin,
}) => {
  return (
    <div className={`cut-section ${isCollapsed ? "collapsed" : ""}`}>
      <div className="cut-section-header">
        <span>Setting {index + 1}</span>
        <div className="cut-section-header-right">
          <label className="header-checkbox">
            <input
              type="checkbox"
              checked={cut.critical}
              onChange={(e) => onCutChange("critical")(e.target.checked)}
            />
            Complex
          </label>
          <label className="header-checkbox">
            <input
              type="checkbox"
              checked={cut.pipFinish}
              onChange={(e) => onCutChange("pipFinish")(e.target.checked)}
            />
            PIP Finish
          </label>
          <div className="priority-dropdown compact">
            <button
              type="button"
              className={`priority-trigger priority-${cut.priority.toLowerCase()}`}
              onClick={onPriorityDropdownToggle}
              aria-label="Priority"
            >
              <div className="priority-flag-wrapper">
                <FlagIcon
                  className={`priority-flag priority-flag-${cut.priority.toLowerCase()}`}
                  sx={{ fontSize: "1rem" }}
                />
                <span className="priority-text">{cut.priority}</span>
              </div>
              <ExpandMoreIcon
                className={`priority-caret ${
                  openPriorityDropdown === index ? "open" : ""
                }`}
                sx={{ fontSize: "0.9rem" }}
              />
            </button>
            {openPriorityDropdown === index && (
              <div className="priority-menu">
                <button
                  type="button"
                  className={`priority-option ${
                    cut.priority === "High" ? "selected" : ""
                  }`}
                  onClick={() => {
                    onCutChange("priority")("High");
                    onPriorityDropdownToggle();
                  }}
                >
                  <FlagIcon
                    className="priority-flag priority-flag-high"
                    sx={{ fontSize: "1rem" }}
                  />
                  <span>High</span>
                </button>
                <button
                  type="button"
                  className={`priority-option ${
                    cut.priority === "Medium" ? "selected" : ""
                  }`}
                  onClick={() => {
                    onCutChange("priority")("Medium");
                    onPriorityDropdownToggle();
                  }}
                >
                  <FlagIcon
                    className="priority-flag priority-flag-medium"
                    sx={{ fontSize: "1rem" }}
                  />
                  <span>Medium</span>
                </button>
                <button
                  type="button"
                  className={`priority-option ${
                    cut.priority === "Low" ? "selected" : ""
                  }`}
                  onClick={() => {
                    onCutChange("priority")("Low");
                    onPriorityDropdownToggle();
                  }}
                >
                  <FlagIcon
                    className="priority-flag priority-flag-low"
                    sx={{ fontSize: "1rem" }}
                  />
                  <span>Low</span>
                </button>
              </div>
            )}
          </div>
          <span
            className={`cut-save-status ${
              isSaved ? "cut-save-status-saved" : "cut-save-status-pending"
            }`}
          >
            {isSaved ? "Saved" : "Not saved"}
          </span>
          {!isFirstCut && (
            <button
              type="button"
              className="cut-remove"
              onClick={onRemoveCut}
              aria-label={`Delete Cut ${index + 1}`}
            >
              <DustbinIcon fontSize="small" />
            </button>
          )}
          <button
            type="button"
            className="cut-toggle-button"
            onClick={onToggle}
            disabled={isFirstCut}
            aria-label={isCollapsed ? "Expand cut" : "Collapse cut"}
          >
            {isCollapsed ? "+" : "–"}
          </button>
        </div>
      </div>
      <div className="cut-section-body">
        <ImageUpload
          images={
            Array.isArray(cut.cutImage)
              ? cut.cutImage
              : cut.cutImage
              ? [cut.cutImage]
              : []
          }
          label={`Cut ${index + 1}`}
          onImageChange={onImageChange}
          onRemove={onRemoveImage}
          readOnly={false}
        />
        <div className="cut-section-grid">
          <FormInput label="Customer" className="grid-customer" required>
            <CustomerAutocomplete
              value={cut.customer}
              onChange={onCutChange("customer")}
              disabled={!isFirstCut}
              required
            />
          </FormInput>

          <FormInput label="Rate (₹/hr)" className="grid-rate" required>
            <input
              type="number"
              value={cut.rate}
              onChange={(e) => onCutChange("rate")(e.target.value)}
            />
          </FormInput>

          <FormInput label="Description" className="grid-description" required>
            <textarea
              rows={1}
              value={cut.description}
              onChange={(e) =>
                onCutChange("description")(e.target.value.toUpperCase())
              }
            />
          </FormInput>

          <FormInput label="Material" className="grid-material">
            <MaterialAutocomplete
              value={cut.material || ""}
              onChange={onCutChange("material")}
            />
          </FormInput>

          <FormInput label="Cut Length (mm)" className="grid-cut" required>
            <input
              type="number"
              value={cut.cut}
              onChange={(e) => onCutChange("cut")(e.target.value)}
            />
          </FormInput>

          <FormInput label="Thickness (mm)" className="grid-thickness" required>
            <input
              type="number"
              value={cut.thickness}
              onChange={(e) => onCutChange("thickness")(e.target.value)}
            />
          </FormInput>

          <FormInput label="Pass" className="grid-pass" required>
            <select
              value={cut.passLevel}
              onChange={(e) => onCutChange("passLevel")(e.target.value)}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </FormInput>

          <FormInput label="Setting Hrs" className="grid-setting" required>
            <input
              type="number"
              value={cut.setting}
              onChange={(e) => onCutChange("setting")(e.target.value)}
            />
          </FormInput>

          <FormInput label="Quantity" className="grid-qty" required>
            <input
              type="number"
              value={cut.qty}
              onChange={(e) => onCutChange("qty")(e.target.value)}
            />
          </FormInput>

          <FormInput label="SEDM" className="grid-sedm" required>
            <select
              value={cut.sedm}
              onChange={(e) => onSedmChange(e.target.value as CutForm["sedm"])}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>

            {cut.sedm === "Yes" && (
              <button
                type="button"
                className="sedm-config-button"
                onClick={onSedmModalOpen}
              >
                Configure SEDM
              </button>
            )}
          </FormInput>

          <FormInput label="Total Hrs/Piece" className="grid-total-hrs">
            <input type="text" value={formatDecimalHoursToHHMMhrs(cutTotals.totalHrs)} readOnly />
          </FormInput>

          {isAdmin && (
            <FormInput label="Total Amount (₹)" className="grid-total-amount">
              <input
                type="text"
                value={cutTotals.totalAmount.toFixed(2)}
                readOnly
              />
            </FormInput>
          )}
        </div>

        <div className="cut-section-actions">
          <button
            type="button"
            className="btn-success small"
            onClick={onSaveCut}
          >
            Save Cut
          </button>
          <button
            type="button"
            className="btn-clear small"
            onClick={onClearCut}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
