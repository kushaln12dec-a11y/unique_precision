import React from "react";
import type { CutForm } from "../programmerUtils";
import ImageUpload from "./ImageUpload";
import { FormInput } from "./FormInput";
import CustomerAutocomplete from "./CustomerAutocomplete";
import MaterialAutocomplete from "./MaterialAutocomplete";
import type { CustomerRate } from "../../../types/masterConfig";
import CutSectionHeader from "./CutSectionHeader";
import CutOperationRows from "./CutOperationRows";
import CutTotalsPanel from "./CutTotalsPanel";
import { parseOperationRows } from "../utils/cutSectionUtils";
import type { CutSectionProps } from "../types/cutSection";

export const CutSection: React.FC<CutSectionProps & { customerOptions: CustomerRate[] }> = ({
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
  const [operationRows, setOperationRows] = React.useState(() => parseOperationRows(cut));

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
    if (nextRowsJson !== String(cut.operationRowsJson || "")) onCutChange("operationRowsJson")(nextRowsJson);
  }, [cut.cut, cut.operationRowsJson, cut.passLevel, cut.qty, cut.setting, cut.thickness, onCutChange, operationRows]);

  const passOptionsList = React.useMemo(
    () => (passOptions.length > 0 ? passOptions : ["1", "2", "3", "4", "5", "6"]).map((value) => String(value || "").trim()).filter((value) => value && value !== "0"),
    [passOptions]
  );

  const customerRateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    customerOptions.forEach((item) => {
      const key = String(item.customer || "").trim().toUpperCase();
      if (key) map.set(key, String(item.rate || "").trim());
    });
    return map;
  }, [customerOptions]);

  React.useEffect(() => {
    if (!isFirstCut) return;
    const selected = String(cut.customer || "").trim().toUpperCase();
    const previous = previousCustomerRef.current;
    if (selected === previous) return;
    previousCustomerRef.current = selected;
    const matchedRate = selected ? customerRateMap.get(selected) : undefined;
    if (matchedRate !== undefined) onCutChange("rate")(matchedRate);
  }, [customerRateMap, cut.customer, isFirstCut, onCutChange]);

  const summaryRow = 2 + operationRows.length;
  const remarkRow = summaryRow + 1;

  return (
    <div className={`cut-section ${isCollapsed ? "collapsed" : ""}`}>
      <CutSectionHeader
        cut={cut}
        index={index}
        isSaved={isSaved}
        isFirstCut={isFirstCut}
        openPriorityDropdown={openPriorityDropdown}
        onCutChange={onCutChange}
        onPriorityDropdownToggle={onPriorityDropdownToggle}
        onRemoveCut={onRemoveCut}
        onToggle={onToggle}
        isCollapsed={isCollapsed}
      />
      <div className="cut-section-body">
        <ImageUpload images={Array.isArray(cut.cutImage) ? cut.cutImage : cut.cutImage ? [cut.cutImage] : []} label={`Cut ${index + 1}`} onImageChange={onImageChange} onRemove={onRemoveImage} readOnly={false} />
        <div className={`cut-section-grid ${isAdmin ? "" : "cut-section-grid-non-admin"}`.trim()}>
          <FormInput label="Customer" className="grid-customer" required error={fieldErrors.customer}>
            <CustomerAutocomplete value={cut.customer} onChange={onCutChange("customer")} disabled={!isFirstCut} required options={customerOptions.map((item) => item.customer)} />
          </FormInput>
          {isAdmin && (
            <FormInput label="Rate (Rs./hr)" className="grid-rate" required error={fieldErrors.rate}>
              <input type="number" min="0" value={cut.rate} disabled={!isFirstCut} placeholder="e.g. 100" onChange={(e) => onCutChange("rate")(e.target.value)} />
            </FormInput>
          )}
          <FormInput label="Material" className="grid-material">
            <MaterialAutocomplete value={cut.material || ""} onChange={onCutChange("material")} options={materialOptions} />
          </FormInput>
          <FormInput label="Program Ref File Name" className="grid-program-ref">
            <input type="text" value={(cut as any).programRefFile || ""} onChange={(e) => onCutChange("programRefFile" as keyof CutForm)(e.target.value.toUpperCase())} placeholder="e.g. UPC001_V1" />
          </FormInput>
          <FormInput label="Description" className="grid-description" required error={fieldErrors.description}>
            <input value={cut.description} placeholder="e.g. CUT DESCRIPTION" onChange={(e) => onCutChange("description")(e.target.value.toUpperCase())} />
          </FormInput>

          <CutOperationRows operationRows={operationRows} setOperationRows={setOperationRows} fieldErrors={fieldErrors} passOptionsList={passOptionsList} />

          <CutTotalsPanel
            cut={cut}
            cutTotals={cutTotals}
            isAdmin={isAdmin}
            summaryRow={summaryRow}
            remarkRow={remarkRow}
            onSedmChange={onSedmChange}
            onSedmModalOpen={onSedmModalOpen}
            onCutChange={onCutChange}
          />

          <div className="cut-section-actions cut-section-actions-inline">
            <button type="button" className="btn-success small" onClick={onSaveCut}>
              Save Setting
            </button>
            <button type="button" className="btn-clear small" onClick={onClearCut}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CutSection;
