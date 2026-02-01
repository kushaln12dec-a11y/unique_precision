import { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import type { CutForm } from "../programmerUtils";
import { SEDM_PRICING, getEffectiveThickness } from "../programmerUtils";
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
}) => {
  const [sedmQuantity, setSedmQuantity] = useState<number>(1);
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
            setSedmQuantity(entries.length);
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
      
      setSedmQuantity(1);
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

  const handleQuantityChange = (value: string) => {
    if (value === "" || value === null || value === undefined) {
      setSedmQuantity(1);
      setSedmEntries([
        {
          thickness: cut.thickness || "",
          lengthValue: cut.sedmLengthValue || "",
          lengthType: cut.sedmLengthType || "min",
          holes: cut.sedmHoles || "1",
        },
      ]);
      return;
    }
    
    const qty = Math.max(1, Number(value) || 1);
    setSedmQuantity(qty);
    
    const currentLength = sedmEntries.length;
    if (qty > currentLength) {
      const newEntries = Array.from({ length: qty - currentLength }, () => ({
        thickness: cut.thickness || "",
        lengthValue: "",
        lengthType: "min" as const,
        holes: "1",
      }));
      setSedmEntries([...sedmEntries, ...newEntries]);
    } else if (qty < currentLength) {
      setSedmEntries(sedmEntries.slice(0, qty));
    }
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
        <div className="input-pair">
          <label>How many SEDM entries?</label>
          <input
            type="number"
            min="1"
            step="1"
            value={sedmQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" || e.key === "Delete") {
                return;
              }
            }}
            placeholder="1"
          />
        </div>
      </div>

      {sedmEntries.map((entry, index) => (
        <div key={index} className="sedm-entry-section">
          <h4 className="sedm-entry-title">SEDM Entry {index + 1}</h4>
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
              <select
                value={entry.lengthValue}
                onChange={(event) => handleEntryChange(index, "lengthValue", event.target.value)}
              >
                <option value="">Select electrode</option>
                {Array.from({ length: 30 }, (_, idx) => (idx + 1) / 10).map(
                  (value) => (
                    <option key={value} value={value.toFixed(1)}>
                      {value.toFixed(1)}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="input-pair">
              <label>TH Option</label>
              <select
                value={entry.lengthType}
                onChange={(event) =>
                  handleEntryChange(index, "lengthType", event.target.value as "min" | "per")
                }
              >
                <option value="min">Min 20mm</option>
                <option value="per">Greater than 20mm</option>
              </select>
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
        Total SEDM Amount: ₹{totalSedmAmount.toFixed(2)}
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
