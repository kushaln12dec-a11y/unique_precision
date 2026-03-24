import SelectDropdown from "./SelectDropdown";
import { normalizeThicknessInput } from "../programmerUtils";
import type { SEDMEntry } from "../utils/sedmModalUtils";

type SedmEntrySectionProps = {
  entry: SEDMEntry;
  index: number;
  cutThickness: string;
  resolvedElectrodeOptions: Array<{ value: string; label: string }>;
  normalizedThOptions: Array<{ value: string; label: string }>;
  showRemove: boolean;
  onRemove: () => void;
  onChange: (field: keyof SEDMEntry, value: string) => void;
};

const SedmEntrySection = ({
  entry,
  index,
  cutThickness,
  resolvedElectrodeOptions,
  normalizedThOptions,
  showRemove,
  onRemove,
  onChange,
}: SedmEntrySectionProps) => {
  return (
    <div className="sedm-entry-section">
      <div className="sedm-entry-header">
        <h4 className="sedm-entry-title">SEDM Entry {index + 1}</h4>
        {showRemove && (
          <button type="button" className="sedm-remove-entry-btn" onClick={onRemove} aria-label={`Remove SEDM Entry ${index + 1}`} title="Remove entry">
            -
          </button>
        )}
      </div>
      <div className="sedm-grid">
        <div className="input-pair">
          <label>TH (mm)</label>
          <input
            type="text"
            value={entry.thickness}
            inputMode="decimal"
            onChange={(event) => onChange("thickness", normalizeThicknessInput(event.target.value, entry.thickness))}
            placeholder={cutThickness || "Enter thickness"}
          />
        </div>
        <div className="input-pair">
          <label>Electrode</label>
          <SelectDropdown
            value={entry.lengthValue}
            options={resolvedElectrodeOptions}
            onChange={(nextValue) => onChange("lengthValue", nextValue)}
            placeholder="Select electrode"
            align="left"
          />
        </div>
        <div className="input-pair">
          <label>TH Option</label>
          <SelectDropdown
            value={entry.lengthType}
            options={normalizedThOptions}
            onChange={(nextValue) => onChange("lengthType", nextValue as "min" | "per")}
            align="left"
          />
        </div>
        <div className="input-pair">
          <label>Holes per Piece</label>
          <input type="number" min="1" step="1" value={entry.holes} onChange={(event) => onChange("holes", event.target.value)} placeholder="1" />
        </div>
      </div>
    </div>
  );
};

export default SedmEntrySection;
