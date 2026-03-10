import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import type { CutForm } from "../programmerUtils";
import { SEDM_PRICING, getEffectiveThickness } from "../programmerUtils";
import SelectDropdown from "./SelectDropdown";
import "../../../components/Modal.css";
import "../Programmer.css";

type SEDMEntry = {
  thickness: string;
  lengthValue: string;
  lengthType: "min" | "per";
  holes: string;
};

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
};

const calculateSingleSedmAmount = (entry: SEDMEntry, qty: number): number => {
  const electrodeSize = entry.lengthValue ? Number(entry.lengthValue) : null;
  if (!electrodeSize || !entry.lengthValue) return 0;
  
  const pricing = SEDM_PRICING.find(
    p => electrodeSize >= p.min && electrodeSize <= p.max
  );
  
  if (!pricing) return 0;
  
  const thickness = Number(entry.thickness) || 0;
  const effectiveThk = getEffectiveThickness(thickness);
  
  let baseValue = pricing.min20;
  if (effectiveThk > 20) {
    baseValue += (effectiveThk - 20) * pricing.perMm;
  }
  
  const holes = Number(entry.holes) || 1;
  return baseValue * holes * qty;
};

const SEDMModal: React.FC<SEDMModalProps> = ({
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
}) => {
  const resolvedElectrodeOptions = (electrodeOptions.length > 0 ? electrodeOptions : [
    "0.3",
    "0.4",
    "0.5",
    "0.6",
    "0.7",
    "0.8",
    "1.0",
    "1.5",
    "2.0",
    "2.5",
    "3.0",
  ]).map((value) => ({ value, label: value }));

  const resolvedThOptions = thOptions.length > 0
    ? thOptions
    : [
        { value: "min", label: "Min" },
        { value: "per", label: "Greater than 20mm" },
      ];
  const normalizedThOptions = resolvedThOptions.map((option) => {
    const value = String(option.value || "").trim().toLowerCase();
    const label = String(option.label || "").trim();
    if (value === "min") return { ...option, label: "Min" };
    if (/^min\s*20/i.test(label)) return { ...option, label: "Min" };
    return option;
  });

  const [sedmEntries, setSedmEntries] = useState<SEDMEntry[]>([
    {
      thickness: cut.thickness || "",
      lengthValue: cut.sedmLengthValue || "",
      lengthType: cut.sedmLengthType || "min",
      holes: cut.sedmHoles || "1",
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (cut.sedmEntriesJson) {
        try {
          const entries: Array<{ thickness: string; lengthValue: string; lengthType?: string; holes: string }> = 
            JSON.parse(cut.sedmEntriesJson);
          if (entries.length > 0) {
            setSedmEntries(
              entries.map(e => ({
                thickness: e.thickness || cut.thickness || "",
                lengthValue: e.lengthValue || "",
                lengthType: (e.lengthType as "min" | "per") || (cut.sedmLengthType as "min" | "per") || "min",
                holes: e.holes || "1",
              }))
            );
            return;
          }
        } catch (e) {
        }
      }
      
      setSedmEntries([
        {
          thickness: cut.thickness || "",
          lengthValue: cut.sedmLengthValue || "",
          lengthType: cut.sedmLengthType || "min",
          holes: cut.sedmHoles || "1",
        },
      ]);
    }
  }, [isOpen, cut]);

  const handleAddEntry = () => {
    setSedmEntries((prev) => [
      ...prev,
      {
        thickness: cut.thickness || "",
        lengthValue: "",
        lengthType: "min",
        holes: "1",
      },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    setSedmEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleEntryChange = (index: number, field: keyof SEDMEntry, value: string) => {
    const updated = [...sedmEntries];
    updated[index] = { ...updated[index], [field]: value };
    setSedmEntries(updated);
  };

  const handleApply = () => {
    if (sedmEntries.length > 0) {
      const firstEntry = sedmEntries[0];
      
      if (sedmEntries.length > 1) {
        const entriesJson = JSON.stringify(
          sedmEntries.map(e => ({
            thickness: e.thickness,
            lengthValue: e.lengthValue,
            lengthType: e.lengthType,
            holes: e.holes,
          }))
        );
        onSedmEntriesJsonChange?.(entriesJson);
        
        const totalHoles = sedmEntries.reduce((sum, entry) => {
          return sum + (Number(entry.holes) || 1);
        }, 0);
        onHolesChange(String(totalHoles));
      } else {
        onSedmEntriesJsonChange?.("");
        onHolesChange(firstEntry.holes);
      }
      
      onThicknessChange?.(firstEntry.thickness);
      onLengthChange(firstEntry.lengthValue);
      onLengthTypeChange(firstEntry.lengthType);
    }
    
    if (onApply) {
      onApply();
    }
    onClose();
  };

  const totalSedmAmount = sedmEntries.reduce((sum, entry) => {
    return sum + calculateSingleSedmAmount(entry, Number(cut.qty) || 1);
  }, 0);

  const totalHoles = sedmEntries.reduce((sum, entry) => {
    return sum + (Number(entry.holes) || 1) * (Number(cut.qty) || 1);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SEDM Details"
      className="sedm-modal"
      size="large"
      disableOverlayClick={true}
    >
      <div className="sedm-quantity-section">
        <button type="button" className="sedm-add-entry-btn" onClick={handleAddEntry}>
          + Add SEDM Entry
        </button>
      </div>

      {sedmEntries.map((entry, index) => (
        <div key={index} className="sedm-entry-section">
          <div className="sedm-entry-header">
            <h4 className="sedm-entry-title">SEDM Entry {index + 1}</h4>
            {sedmEntries.length > 1 && (
              <button
                type="button"
                className="sedm-remove-entry-btn"
                onClick={() => handleRemoveEntry(index)}
                aria-label={`Remove SEDM Entry ${index + 1}`}
                title="Remove entry"
              >
                -
              </button>
            )}
          </div>
          <div className="sedm-grid">
            <div className="input-pair">
              <label>TH (mm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={entry.thickness}
                onChange={(event) => handleEntryChange(index, "thickness", event.target.value)}
                placeholder={cut.thickness || "Enter thickness"}
              />
            </div>
            <div className="input-pair">
              <label>Electrode</label>
              <SelectDropdown
                value={entry.lengthValue}
                    options={resolvedElectrodeOptions}
                onChange={(nextValue) => handleEntryChange(index, "lengthValue", nextValue)}
                placeholder="Select electrode"
                align="left"
              />
            </div>
            <div className="input-pair">
              <label>TH Option</label>
              <SelectDropdown
                value={entry.lengthType}
                options={normalizedThOptions}
                onChange={(nextValue) =>
                  handleEntryChange(index, "lengthType", nextValue as "min" | "per")
                }
                align="left"
              />
            </div>
            <div className="input-pair">
              <label>Holes per Piece</label>
              <input
                type="number"
                min="1"
                step="1"
                value={entry.holes}
                onChange={(event) => handleEntryChange(index, "holes", event.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        </div>
      ))}

      <p className="sedm-meta">
        Job Quantity: {cut.qty || "0"} | Total Holes: {totalHoles}
      </p>
      <p className="sedm-amount">
        Total SEDM Amount: Rs. {totalSedmAmount.toFixed(2)}
      </p>
      <div className="sedm-modal-actions">
        <button
          type="button"
          className="sedm-btn-apply"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </Modal>
  );
};

export default SEDMModal;
