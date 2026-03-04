import React from "react";
import type { CutForm } from "../programmerUtils";
import { DustbinIcon } from "../../../utils/icons";
import ImageUpload from "./ImageUpload";
import { FormInput } from "./FormInput";
import CustomerAutocomplete from "./CustomerAutocomplete";
import MaterialAutocomplete from "./MaterialAutocomplete";
import SelectDropdown from "./SelectDropdown";
import FlagIcon from "@mui/icons-material/Flag";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";
import type { CustomerRate } from "../../../types/masterConfig";

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
  customerOptions: CustomerRate[];
  materialOptions: string[];
  passOptions: string[];
};

type OperationRow = {
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
};

const parseOperationRows = (cut: CutForm): OperationRow[] => {
  const fallbackRow: OperationRow = {
    cut: cut.cut,
    thickness: cut.thickness,
    passLevel: cut.passLevel,
    setting: cut.setting,
    qty: cut.qty,
  };

  if (!cut.operationRowsJson || !cut.operationRowsJson.trim()) {
    return [fallbackRow];
  }

  try {
    const parsed = JSON.parse(cut.operationRowsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return [fallbackRow];
    const rows = parsed
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        cut: String((row as any).cut ?? ""),
        thickness: String((row as any).thickness ?? ""),
        passLevel: String((row as any).passLevel ?? "0"),
        setting: String((row as any).setting ?? "0"),
        qty: String((row as any).qty ?? "0"),
      }));
    return rows.length > 0 ? rows : [fallbackRow];
  } catch (error) {
    return [fallbackRow];
  }
};

const SEDM_OPTIONS: Array<{ value: CutForm["sedm"]; label: string }> = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];


export const CutSection: React.FC<CutSectionProps> = ({
  cut,
  index,
  cutTotals,
  isCollapsed,
  isSaved,
  fieldErrors,
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
  customerOptions,
  materialOptions,
  passOptions,
}) => {
  const [operationRows, setOperationRows] = React.useState<OperationRow[]>(() => parseOperationRows(cut));

  React.useEffect(() => {
    setOperationRows(parseOperationRows(cut));
  }, [cut.operationRowsJson, cut.cut, cut.thickness, cut.passLevel, cut.setting, cut.qty]);

  React.useEffect(() => {
    const first = operationRows[0];
    if (!first) return;
    if (first.cut !== cut.cut) onCutChange("cut")(first.cut);
    if (first.thickness !== cut.thickness) onCutChange("thickness")(first.thickness);
    if (first.passLevel !== cut.passLevel) onCutChange("passLevel")(first.passLevel);
    if (first.setting !== cut.setting) onCutChange("setting")(first.setting);
    if (first.qty !== cut.qty) onCutChange("qty")(first.qty);
    const nextRowsJson = JSON.stringify(operationRows);
    if (nextRowsJson !== String(cut.operationRowsJson || "")) {
      onCutChange("operationRowsJson")(nextRowsJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationRows]);

  const passDropdownOptions = React.useMemo(() => {
    const source = passOptions.length > 0 ? passOptions : ["1", "2", "3", "4", "5", "6"];
    const normalized = source.includes("0") ? source : ["0", ...source];
    return normalized.map((value) => ({ value, label: value }));
  }, [passOptions]);

  const customerRateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    customerOptions.forEach((item) => {
      const key = String(item.customer || "").trim().toUpperCase();
      if (!key) return;
      map.set(key, String(item.rate || "").trim());
    });
    return map;
  }, [customerOptions]);

  React.useEffect(() => {
    if (!isFirstCut) return;
    const selected = String(cut.customer || "").trim().toUpperCase();
    if (!selected) return;
    const matchedRate = customerRateMap.get(selected);
    if (matchedRate !== undefined && matchedRate !== String(cut.rate || "")) {
      onCutChange("rate")(matchedRate);
    }
  }, [isFirstCut, cut.customer, cut.rate, customerRateMap, onCutChange]);
  
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
          <FormInput label="Customer" className="grid-customer" required error={fieldErrors.customer}>
            <CustomerAutocomplete
              value={cut.customer}
              onChange={onCutChange("customer")}
              disabled={!isFirstCut}
              required
              options={customerOptions.map((item) => item.customer)}
            />
          </FormInput>

          <FormInput label="Rate (₹/hr)" className="grid-rate" required error={fieldErrors.rate}>
            <input
              type="number"
              value={cut.rate}
              onChange={(e) => onCutChange("rate")(e.target.value)}
            />
          </FormInput>

          <FormInput label="Material" className="grid-material">
            <MaterialAutocomplete
              value={cut.material || ""}
              onChange={onCutChange("material")}
              options={materialOptions}
            />
          </FormInput>

          <FormInput label="Program Ref File Name" className="grid-program-ref">
            <input
              type="text"
              value={(cut as any).programRefFile || ""}
              onChange={(e) =>
                onCutChange("programRefFile" as keyof CutForm)(e.target.value.toUpperCase())
              }
              placeholder="e.g. UPC001_V1"
            />
          </FormInput>

          <FormInput label="Description" className="grid-description" required error={fieldErrors.description}>
            <input
              value={cut.description}
              onChange={(e) =>
                onCutChange("description")(e.target.value.toUpperCase())
              }
            />
          </FormInput>

          {operationRows.map((row, rowIndex) => {
            // First row uses grid areas, additional rows use explicit grid positioning
            const isFirstRow = rowIndex === 0;
            const gridRow = isFirstRow ? undefined : 2 + rowIndex; // Row 2 is the first operation row, so additional rows start at row 3
            return (
              <React.Fragment key={rowIndex}>
                <FormInput 
                  label={isFirstRow ? "Cut Length (mm)" : ""} 
                  className={isFirstRow ? "grid-cut" : "operation-row-item"}
                  error={isFirstRow ? fieldErrors.cut : undefined}
                  style={!isFirstRow ? { gridRow: gridRow, gridColumn: 1 } : undefined}
                >
                  <input
                    type="number"
                    value={row.cut}
                    placeholder= "Cut Length (mm)"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].cut = e.target.value;
                      setOperationRows(updated);
                    }}
                  />
                </FormInput>

                <FormInput 
                  label={isFirstRow ? "Thickness (mm)" : ""} 
                  className={isFirstRow ? "grid-thickness" : "operation-row-item"}
                  error={isFirstRow ? fieldErrors.thickness : undefined}
                  style={!isFirstRow ? { gridRow: gridRow, gridColumn: 2 } : undefined}
                >
                  <input
                    type="number"
                    value={row.thickness}
                    placeholder= "Thickness (mm)"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].thickness = e.target.value;
                      setOperationRows(updated);
                    }}
                  />
                </FormInput>

                <FormInput 
                  label={isFirstRow ? "Pass" : ""} 
                  className={isFirstRow ? "grid-pass" : "operation-row-item"}
                  error={isFirstRow ? fieldErrors.passLevel : undefined}
                  style={!isFirstRow ? { gridRow: gridRow, gridColumn: 3 } : undefined}
                >
                  <SelectDropdown
                    value={row.passLevel}
                    options={passDropdownOptions}
                    onChange={(nextValue) => {
                      const updated = [...operationRows];
                      updated[rowIndex].passLevel = nextValue;
                      setOperationRows(updated);
                    }}
                  />
                </FormInput>

                <FormInput 
                  label={isFirstRow ? "Setting Hrs" : ""} 
                  className={isFirstRow ? "grid-setting" : "operation-row-item"}
                  error={isFirstRow ? fieldErrors.setting : undefined}
                  style={!isFirstRow ? { gridRow: gridRow, gridColumn: 4 } : undefined}
                >
                  <input
                    type="number"
                    value={row.setting}
                    placeholder="Setting Hrs"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].setting = e.target.value;
                      setOperationRows(updated);
                    }}
                  />
                </FormInput>

                <FormInput 
                  label={isFirstRow ? "Quantity" : ""} 
                  className={isFirstRow ? "grid-qty" : "operation-row-item"}
                  error={isFirstRow ? fieldErrors.qty : undefined}
                  style={!isFirstRow ? { gridRow: gridRow, gridColumn: 5 } : undefined}
                >
                  <div className="qty-with-add">
                    <input
                      type="number"
                      value={row.qty}
                      placeholder="Quantity"
                      onChange={(e) => {
                        const updated = [...operationRows];
                        updated[rowIndex].qty = e.target.value;
                        setOperationRows(updated);
                      }}
                    />

                    {isFirstRow && (
                      <button
                        type="button"
                        className="add-row-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updated = [...operationRows];
                          updated.splice(rowIndex + 1, 0, {
                            cut: "",
                            thickness: "",
                            passLevel: "0",
                            setting: "0",
                            qty: "0",
                          });
                          setOperationRows(updated);
                        }}
                        aria-label="Add new row"
                        title="Add new row"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}

                    {!isFirstRow && (
                      <button
                        type="button"
                        className="remove-row-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updated = operationRows.filter((_, idx) => idx !== rowIndex);
                          setOperationRows(updated);
                        }}
                        aria-label="Remove row"
                        title="Remove row"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </FormInput>
              </React.Fragment>
            );
          })}

          <FormInput 
            label="SEDM" 
            className="grid-sedm" 
            required
            style={{ gridRow: 2 + operationRows.length }}
          >
            <SelectDropdown
              value={cut.sedm}
              options={SEDM_OPTIONS}
              onChange={(nextValue) => onSedmChange(nextValue as CutForm["sedm"])}
            />

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

          <FormInput 
            label="Total Time Needed" 
            className="grid-total-hrs"
            style={{ gridRow: 2 + operationRows.length }}
          >
            <input
              type="text"
              value={formatDecimalHoursToHHMMhrs(cutTotals.totalHrs)}
              readOnly
            />
          </FormInput>

          {isAdmin && (
            <FormInput 
              label="Total Amount (₹)" 
              className="grid-total-amount"
              style={{ gridRow: 2 + operationRows.length }}
            >
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
            Save Setting
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
