import React from "react";
import { FormInput } from "./FormInput";
import SelectDropdown from "./SelectDropdown";
import { formatEstimatedTime } from "../../../utils/jobFormatting";
import type { CutForm } from "../programmerUtils";
import type { CutTotals } from "../types/cutSection";
import { normalizeNonNegativeNumberInput, SEDM_OPTIONS } from "../utils/cutSectionUtils";

type Props = {
  cut: CutForm;
  cutTotals: CutTotals;
  isAdmin: boolean;
  summaryRow: number;
  remarkRow: number;
  onSedmChange: (value: CutForm["sedm"]) => void;
  onSedmModalOpen: () => void;
  onCutChange: <K extends keyof CutForm>(field: K) => (value: CutForm[K]) => void;
};

export const CutTotalsPanel: React.FC<Props> = ({
  cut,
  cutTotals,
  isAdmin,
  summaryRow,
  remarkRow,
  onSedmChange,
  onSedmModalOpen,
  onCutChange,
}) => {
  return (
    <>
      <FormInput label="SEDM" className="grid-sedm" required style={{ gridRow: summaryRow }}>
        <SelectDropdown value={cut.sedm} options={SEDM_OPTIONS} onChange={(nextValue) => onSedmChange(nextValue as CutForm["sedm"])} />
        {cut.sedm === "Yes" && (
          <button type="button" className="sedm-config-button" onClick={onSedmModalOpen}>
            Configure SEDM
          </button>
        )}
      </FormInput>

      <FormInput label="Cut Length Hrs" className="grid-total-hrs" style={{ gridRow: summaryRow }}>
        <input
          type="number"
          step="0.01"
          min="0"
          value={String(cut.manualTotalHrs ?? "").trim() !== "" ? String(cut.manualTotalHrs) : cutTotals.totalHrs.toFixed(2)}
          onFocus={() => {
            if (String(cut.manualTotalHrs ?? "").trim() === "") onCutChange("manualTotalHrs")(cutTotals.totalHrs.toFixed(2));
          }}
          onChange={(e) => onCutChange("manualTotalHrs")(normalizeNonNegativeNumberInput(e.target.value))}
        />
      </FormInput>

      <FormInput label="Estimated Time" className="grid-estimated-time" style={{ gridRow: summaryRow }}>
        <input type="text" value={formatEstimatedTime(cutTotals.estimatedTime)} readOnly />
      </FormInput>

      {isAdmin && (
        <FormInput label="Total Amount (Rs.)" className="grid-total-amount" style={{ gridRow: summaryRow }}>
          <input type="text" value={cutTotals.totalAmount.toFixed(2)} readOnly />
        </FormInput>
      )}

      <FormInput label="Remark" className="grid-remark" style={{ gridRow: remarkRow, gridColumn: "1 / -1" }}>
        <textarea rows={3} value={cut.remark || ""} placeholder="Enter remark" onChange={(e) => onCutChange("remark")(e.target.value.toUpperCase())} />
      </FormInput>
    </>
  );
};

export default CutTotalsPanel;
