import React from "react";
import { normalizeThicknessInput } from "../programmerUtils";
import { FormInput } from "./FormInput";
import PassAutocomplete from "./PassAutocomplete";
import { normalizeNonNegativeNumberInput } from "../utils/cutSectionUtils";
import type { OperationRow } from "../types/cutSection";

type Props = {
  operationRows: OperationRow[];
  setOperationRows: React.Dispatch<React.SetStateAction<OperationRow[]>>;
  fieldErrors: Record<string, string>;
  passOptionsList: string[];
};

export const CutOperationRows: React.FC<Props> = ({ operationRows, setOperationRows, fieldErrors, passOptionsList }) => {
  return (
    <>
      {operationRows.map((row, rowIndex) => {
        const isFirstRow = rowIndex === 0;
        const gridRow = isFirstRow ? undefined : 2 + rowIndex;
        return (
          <React.Fragment key={rowIndex}>
            <FormInput label={isFirstRow ? "Cut Length (mm)" : ""} className={isFirstRow ? "grid-cut" : "operation-row-item"} error={isFirstRow ? fieldErrors.cut : undefined} style={!isFirstRow ? { gridRow, gridColumn: 1 } : undefined}>
              <input
                type="number"
                min="0"
                value={row.cut}
                placeholder="Cut Length (mm)"
                onChange={(e) => {
                  const updated = [...operationRows];
                  updated[rowIndex].cut = normalizeNonNegativeNumberInput(e.target.value);
                  setOperationRows(updated);
                }}
              />
            </FormInput>

            <FormInput label={isFirstRow ? "Thickness (mm)" : ""} className={isFirstRow ? "grid-thickness" : "operation-row-item"} error={isFirstRow ? fieldErrors.thickness : undefined} style={!isFirstRow ? { gridRow, gridColumn: 2 } : undefined}>
              <input
                type="text"
                value={row.thickness}
                placeholder="Thickness (mm)"
                inputMode="decimal"
                onChange={(e) => {
                  const updated = [...operationRows];
                  updated[rowIndex].thickness = normalizeThicknessInput(e.target.value, updated[rowIndex].thickness);
                  setOperationRows(updated);
                }}
              />
            </FormInput>

            <FormInput label={isFirstRow ? "Pass" : ""} className={isFirstRow ? "grid-pass" : "operation-row-item"} error={isFirstRow ? fieldErrors.passLevel : undefined} style={!isFirstRow ? { gridRow, gridColumn: 3 } : undefined}>
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

            <FormInput label={isFirstRow ? "Setting Hrs" : ""} className={isFirstRow ? "grid-setting" : "operation-row-item"} error={isFirstRow ? fieldErrors.setting : undefined} style={!isFirstRow ? { gridRow, gridColumn: 4 } : undefined}>
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

            <FormInput label={isFirstRow ? "Quantity" : ""} className={isFirstRow ? "grid-qty" : "operation-row-item"} error={isFirstRow ? fieldErrors.qty : undefined} style={!isFirstRow ? { gridRow, gridColumn: 5 } : undefined}>
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
                {isFirstRow ? (
                  <button
                    type="button"
                    className="add-row-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const updated = [...operationRows];
                      updated.splice(rowIndex + 1, 0, { cut: "", thickness: "", passLevel: "", setting: "", qty: "" });
                      setOperationRows(updated);
                    }}
                    aria-label="Add new row"
                    title="Add new row"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="remove-row-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOperationRows(operationRows.filter((_, idx) => idx !== rowIndex));
                    }}
                    aria-label="Remove row"
                    title="Remove row"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </FormInput>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CutOperationRows;
