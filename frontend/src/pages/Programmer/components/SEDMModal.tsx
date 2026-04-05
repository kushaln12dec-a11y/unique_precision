import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import type { CutForm } from "../programmerUtils";
import SedmEntrySection from "./SedmEntrySection";
import "../../../components/Modal.css";
import "../Programmer.css";
import {
  buildInitialSedmEntries,
  calculateSingleSedmAmount,
  splitThicknessParts,
  type SEDMEntry,
} from "../utils/sedmModalUtils";

type SEDMModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cut: CutForm;
  onLengthChange: (value: string) => void;
  onLengthTypeChange: (value: "min" | "per") => void;
  onHolesChange: (value: string) => void;
  onThicknessChange?: (value: string) => void;
  onSedmEntriesJsonChange?: (value: string) => void;
  onApply?: () => void;
  electrodeOptions?: string[];
  thOptions?: Array<{ value: string; label: string }>;
  isAdmin?: boolean;
};

const SEDMModal = ({
  isOpen,
  onClose,
  cut,
  onLengthChange,
  onLengthTypeChange,
  onHolesChange,
  onThicknessChange,
  onSedmEntriesJsonChange,
  onApply,
  electrodeOptions = [],
  thOptions = [],
  isAdmin = false,
}: SEDMModalProps) => {
  const [sedmEntries, setSedmEntries] = useState<SEDMEntry[]>([]);

  const resolvedElectrodeOptions = useMemo(
    () => (electrodeOptions.length > 0 ? electrodeOptions : ["0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "1.0", "1.5", "2.0", "2.5", "3.0"]).map((value) => ({ value, label: value })),
    [electrodeOptions]
  );
  const normalizedThOptions = useMemo(
    () =>
      (thOptions.length > 0 ? thOptions : [{ value: "min", label: "Min" }, { value: "per", label: "Greater than 20mm" }]).map((option) => {
        const value = String(option.value || "").trim().toLowerCase();
        const label = String(option.label || "").trim();
        if (value === "min" || /^min\s*20/i.test(label)) return { ...option, label: "Min" };
        return option;
      }),
    [thOptions]
  );

  useEffect(() => {
    if (isOpen) {
      const entries = buildInitialSedmEntries(cut);
      setSedmEntries(entries.length > 0 ? entries : [{ thickness: cut.thickness || "", lengthValue: cut.sedmLengthValue || "", lengthType: cut.sedmLengthType || "min", holes: cut.sedmHoles || "1" }]);
    }
  }, [isOpen, cut]);

  useEffect(() => {
    setSedmEntries((prev) => {
      let changed = false;
      const expanded: SEDMEntry[] = [];
      prev.forEach((entry) => {
        const parts = splitThicknessParts(entry.thickness);
        if (parts.length === 2) {
          changed = true;
          expanded.push({ ...entry, thickness: parts[0] }, { ...entry, thickness: parts[1] });
        } else {
          expanded.push(entry);
        }
      });
      return changed ? expanded : prev;
    });
  }, [sedmEntries]);

  const handleEntryChange = (index: number, field: keyof SEDMEntry, value: string) => {
    const updated = [...sedmEntries];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "thickness") {
      const parts = splitThicknessParts(value);
      if (parts.length === 2) {
        const [left, right] = parts;
        updated[index] = { ...updated[index], thickness: left };
        const hasRightEntry = updated.some((entry, idx) => idx !== index && entry.thickness.trim() === right && entry.lengthValue === updated[index].lengthValue && entry.lengthType === updated[index].lengthType && entry.holes === updated[index].holes);
        if (!hasRightEntry) {
          updated.splice(index + 1, 0, { thickness: right, lengthValue: updated[index].lengthValue, lengthType: updated[index].lengthType, holes: updated[index].holes });
        }
      }
    }
    setSedmEntries(updated);
  };

  const totalSedmAmount = sedmEntries.reduce((sum, entry) => sum + calculateSingleSedmAmount(entry, Number(cut.qty) || 1), 0);
  const totalHoles = sedmEntries.reduce((sum, entry) => sum + ((Number(entry.holes) || 1) * Math.max(1, splitThicknessParts(entry.thickness).length) * (Number(cut.qty) || 1)), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SEDM Details" className="sedm-modal" size="large" disableOverlayClick>
      <div className="sedm-quantity-section">
        <button type="button" className="sedm-add-entry-btn" onClick={() => setSedmEntries((prev) => [...prev, { thickness: cut.thickness || "", lengthValue: "", lengthType: "min", holes: "1" }])}>
          + Add SEDM Entry
        </button>
      </div>

      <div className="sedm-entry-list">
        {sedmEntries.map((entry, index) => (
          <SedmEntrySection
            key={index}
            entry={entry}
            index={index}
            cutThickness={cut.thickness || ""}
            resolvedElectrodeOptions={resolvedElectrodeOptions}
            normalizedThOptions={normalizedThOptions}
            showRemove={sedmEntries.length > 1}
            onRemove={() => setSedmEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)))}
            onChange={(field, value) => handleEntryChange(index, field, value)}
          />
        ))}
      </div>

      <p className="sedm-meta">Job Quantity: {cut.qty || "0"} | Total Holes: {totalHoles}</p>
      {isAdmin && <p className="sedm-amount">Total SEDM Amount: Rs. {totalSedmAmount.toFixed(2)}</p>}
      <div className="sedm-modal-actions">
        <button
          type="button"
          className="sedm-btn-apply"
          onClick={() => {
            if (sedmEntries.length > 0) {
              const expandedEntries = sedmEntries.flatMap((entry) => splitThicknessParts(entry.thickness).map((thickness) => ({ thickness, lengthValue: entry.lengthValue, lengthType: entry.lengthType, holes: entry.holes })));
              const firstEntry = expandedEntries[0];
              if (expandedEntries.length > 1) {
                onSedmEntriesJsonChange?.(JSON.stringify(expandedEntries));
                onHolesChange(String(expandedEntries.reduce((sum, entry) => sum + (Number(entry.holes) || 1), 0)));
              } else {
                onSedmEntriesJsonChange?.("");
                onHolesChange(firstEntry?.holes || "1");
              }
              onThicknessChange?.(firstEntry?.thickness || "");
              onLengthChange(firstEntry?.lengthValue || "");
              onLengthTypeChange((firstEntry?.lengthType as "min" | "per") || "min");
            }
            onApply?.();
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </Modal>
  );
};

export default SEDMModal;
