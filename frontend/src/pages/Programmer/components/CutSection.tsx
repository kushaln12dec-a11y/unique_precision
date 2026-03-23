import React from "react";
import { normalizeThicknessInput, type CutForm, type CalculationResult } from "../programmerUtils";
import { DustbinIcon } from "../../../utils/icons";
import ImageUpload from "./ImageUpload";
import { FormInput } from "./FormInput";
import CustomerAutocomplete from "./CustomerAutocomplete";
import MaterialAutocomplete from "./MaterialAutocomplete";
import PassAutocomplete from "./PassAutocomplete";
import SelectDropdown from "./SelectDropdown";
import FlagIcon from "@mui/icons-material/Flag";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { CustomerRate } from "../../../types/masterConfig";
import { formatEstimatedTime } from "../../../utils/jobFormatting";

type CutTotals = {
  totalHrs: number;
  totalAmount: number;
  wedmAmount: number;
  sedmAmount: number;
  estimatedTime: number;
  wedmBreakdown: CalculationResult["wedmBreakdown"];
  sedmBreakdown: CalculationResult["sedmBreakdown"];
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
        cut: String((row as any).cut ?? (row as any).cutLength ?? ""),
        thickness: String((row as any).thickness ?? (row as any).thk ?? ""),
        passLevel: String((row as any).passLevel ?? (row as any).pass ?? ""),
        setting: String((row as any).setting ?? (row as any).settingHrs ?? ""),
        qty: String((row as any).qty ?? (row as any).quantity ?? ""),
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

const normalizeNonNegativeNumberInput = (value: string): string => {
  const raw = String(value || "");
  if (raw === "") return "";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "";
  return parsed < 0 ? "0" : raw;
};


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
  const previousCustomerRef = React.useRef<string>(String(cut.customer || "").trim().toUpperCase());
  const isHydratingRowsRef = React.useRef<boolean>(false);
  const [operationRows, setOperationRows] = React.useState<OperationRow[]>(() => parseOperationRows(cut));

  React.useEffect(() => {
    isHydratingRowsRef.current = true;
    setOperationRows(parseOperationRows(cut));
  }, [cut.operationRowsJson, cut.cut, cut.thickness, cut.passLevel, cut.setting, cut.qty]);

  React.useEffect(() => {
    if (isHydratingRowsRef.current) {
      isHydratingRowsRef.current = false;
      return;
    }
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

  const passOptionsList = React.useMemo(() => {
    const source = passOptions.length > 0 ? passOptions : ["1", "2", "3", "4", "5", "6"];
    return source
      .map((value) => String(value || "").trim())
      .filter((value) => value && value !== "0");
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
    const previous = previousCustomerRef.current;
    if (selected === previous) return;
    previousCustomerRef.current = selected;
    if (!selected) return;
    const matchedRate = customerRateMap.get(selected);
    if (matchedRate !== undefined) {
      onCutChange("rate")(matchedRate);
    }
  }, [isFirstCut, cut.customer, customerRateMap, onCutChange]);
  
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
            {isCollapsed ? "+" : "-"}
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
        <div className={`cut-section-grid ${isAdmin ? "" : "cut-section-grid-non-admin"}`.trim()}>
          <FormInput label="Customer" className="grid-customer" required error={fieldErrors.customer}>
            <CustomerAutocomplete
              value={cut.customer}
              onChange={onCutChange("customer")}
              disabled={!isFirstCut}
              required
              options={customerOptions.map((item) => item.customer)}
            />
          </FormInput>

          {isAdmin && (
            <FormInput label="Rate (Rs./hr)" className="grid-rate" required error={fieldErrors.rate}>
              <input
                type="number"
                min="0"
                value={cut.rate}
                disabled={!isFirstCut}
                placeholder="e.g. 100"
                onChange={(e) => onCutChange("rate")(normalizeNonNegativeNumberInput(e.target.value))}
              />
            </FormInput>
          )}

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
              placeholder="e.g. CUT DESCRIPTION"
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
                    min="0"
                    value={row.cut}
                    placeholder= "Cut Length (mm)"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].cut = normalizeNonNegativeNumberInput(e.target.value);
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
                    type="text"
                    value={row.thickness}
                    placeholder= "Thickness (mm)"
                    inputMode="decimal"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].thickness = normalizeThicknessInput(
                        e.target.value,
                        updated[rowIndex].thickness
                      );
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
                <PassAutocomplete
                  value={row.passLevel}
                  options={passOptionsList}
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
                    min="0"
                    value={row.setting}
                    placeholder="Setting Hrs"
                    onChange={(e) => {
                      const updated = [...operationRows];
                      updated[rowIndex].setting = normalizeNonNegativeNumberInput(e.target.value);
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
                      min="0"
                      value={row.qty}
                      placeholder="Quantity"
                      onChange={(e) => {
                        const updated = [...operationRows];
                        updated[rowIndex].qty = normalizeNonNegativeNumberInput(e.target.value);
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
                            passLevel: "",
                            setting: "",
                            qty: "",
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
            label="Cut Length Hrs" 
            className="grid-total-hrs"
            style={{ gridRow: 2 + operationRows.length }}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={String(cut.manualTotalHrs ?? "").trim() !== "" ? String(cut.manualTotalHrs) : cutTotals.totalHrs.toFixed(2)}
              onFocus={() => {
                if (String(cut.manualTotalHrs ?? "").trim() === "") {
                  onCutChange("manualTotalHrs")(cutTotals.totalHrs.toFixed(2));
                }
              }}
              onChange={(e) => onCutChange("manualTotalHrs")(normalizeNonNegativeNumberInput(e.target.value))}
            />
          </FormInput>

          <FormInput
            label="Estimated Time"
            className="grid-estimated-time"
            style={{ gridRow: 2 + operationRows.length }}
          >
            <input
              type="text"
              value={formatEstimatedTime(cutTotals.estimatedTime)}
              readOnly
            />
          </FormInput>

          {isAdmin && (
            <FormInput 
              label="Total Amount (Rs.)" 
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

          <div
            className="calculation-formula-panel"
            style={{ gridRow: 3 + operationRows.length, gridColumn: "1 / -1" }}
          >
            <h5>Calculation Formula</h5>
            <div className="formula-block">
              {cutTotals.wedmBreakdown.rows.map((row) => (
                <p key={`wedm-row-${row.rowIndex}`}>
                  {row.qtyFirstSettingRuleApplied
                    ? `Row ${row.rowIndex}: base = (${row.cutLength.toFixed(2)} x ${row.thicknessUsed.toFixed(2)}) / ${row.divisor} = ${row.base.toFixed(4)}; pass = ${row.base.toFixed(4)} + (${row.base.toFixed(4)} x ${row.passPercent.toFixed(0)}%) = ${row.cutAfterPassRaw.toFixed(4)}; min rule on pass => ${row.passAfterMin.toFixed(4)}; pass x qty = ${row.passAfterMin.toFixed(4)} x ${row.qty} = ${(row.passAfterMin * row.qty).toFixed(4)}; setting(${row.settingInput}) => ${row.settingHours.toFixed(2)}; pass*qty+setting = ${row.passPlusSettingWithMin.toFixed(4)}; extras(per unit) => ${row.extraHoursPerUnit.toFixed(2)}; row hrs = ${row.rowHours.toFixed(4)}`
                    : `Row ${row.rowIndex}: base = (${row.cutLength.toFixed(2)} x ${row.thicknessUsed.toFixed(2)}) / ${row.divisor} = ${row.base.toFixed(4)}; pass = ${row.base.toFixed(4)} + (${row.base.toFixed(4)} x ${row.passPercent.toFixed(0)}%) = ${row.cutAfterPassRaw.toFixed(4)}; setting(${row.settingInput}) => ${row.settingHours.toFixed(2)}; pass+setting = ${row.passPlusSettingRaw.toFixed(4)}; min rule => ${row.passPlusSettingWithMin.toFixed(4)}; extras(per unit) => ${row.extraHoursPerUnit.toFixed(2)}; row hrs = ${row.rowHours.toFixed(4)}`}
                </p>
              ))}
              {isAdmin && <p>{`WEDM Cost = ${cutTotals.totalHrs.toFixed(4)} x rate(${cutTotals.wedmBreakdown.rate.toFixed(2)}) = ${cutTotals.wedmAmount.toFixed(2)}`}</p>}
              {isAdmin && (cutTotals.sedmBreakdown.entries.length > 0 ? (
                cutTotals.sedmBreakdown.entries.map((entry) => (
                  <p key={`sedm-entry-${entry.entryIndex}`}>
                    {`SEDM ${entry.entryIndex}: baseCost = ${
                      entry.thicknessUsed > 20
                        ? `${entry.thicknessInput} x ${entry.perMm.toFixed(2)}`
                        : `${entry.min20.toFixed(2)} (Min20)`
                    } = ${entry.baseCost.toFixed(2)}; entry = ${entry.baseCost.toFixed(2)} x holes(${entry.holes}) x qty(${entry.qty}) = ${entry.entryCost.toFixed(2)}`}
                  </p>
                ))
              ) : (
                <p>SEDM Cost = 0.00</p>
              ))}
              {isAdmin && <p>{`Total Amount = WEDM(${cutTotals.wedmAmount.toFixed(2)}) + SEDM(${cutTotals.sedmAmount.toFixed(2)}) = ${cutTotals.totalAmount.toFixed(2)}`}</p>}
              <p>{`Estimated Time = WEDM / 625 = ${cutTotals.wedmAmount.toFixed(2)} / 625 = ${formatEstimatedTime(cutTotals.estimatedTime)}`}</p>
            </div>
          </div>
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
