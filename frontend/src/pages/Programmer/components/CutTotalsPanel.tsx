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
  formulaRow: number;
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
  formulaRow,
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

      <div className="calculation-formula-panel" style={{ gridRow: formulaRow, gridColumn: "1 / -1" }}>
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
          {isAdmin &&
            (cutTotals.sedmBreakdown.entries.length > 0
              ? cutTotals.sedmBreakdown.entries.map((entry) => (
                  <p key={`sedm-entry-${entry.entryIndex}`}>
                    {`SEDM ${entry.entryIndex}: baseCost = ${entry.thicknessUsed > 20 ? `${entry.thicknessInput} x ${entry.perMm.toFixed(2)}` : `${entry.min20.toFixed(2)} (Min20)`} = ${entry.baseCost.toFixed(2)}; entry = ${entry.baseCost.toFixed(2)} x holes(${entry.holes}) x qty(${entry.qty}) = ${entry.entryCost.toFixed(2)}`}
                  </p>
                ))
              : <p>SEDM Cost = 0.00</p>)}
          {isAdmin && <p>{`Total Amount = WEDM(${cutTotals.wedmAmount.toFixed(2)}) + SEDM(${cutTotals.sedmAmount.toFixed(2)}) = ${cutTotals.totalAmount.toFixed(2)}`}</p>}
          <p>{`Estimated Time = WEDM / 625 = ${cutTotals.wedmAmount.toFixed(2)} / 625 = ${formatEstimatedTime(cutTotals.estimatedTime)}`}</p>
        </div>
      </div>
    </>
  );
};

export default CutTotalsPanel;
