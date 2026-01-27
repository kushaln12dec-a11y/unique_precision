import Modal from "../../../components/Modal";
import type { CutForm } from "../programmerUtils";
import { calculateSedmAmount } from "../programmerUtils";
import "../../../components/Modal.css";
import "../Programmer.css";

type SEDMModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cut: CutForm;
  onLengthChange: (value: string) => void;
  onLengthTypeChange: (value: "min" | "per") => void;
  onHolesChange: (value: string) => void;
  onApply?: () => void;
};

const SEDMModal: React.FC<SEDMModalProps> = ({
  isOpen,
  onClose,
  cut,
  onLengthChange,
  onLengthTypeChange,
  onHolesChange,
  onApply,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SEDM Details"
      className="sedm-modal"
      size="large"
    >
      <div className="sedm-grid">
        <div className="input-pair">
          <label>Length</label>
          <select
            value={cut.sedmLengthValue}
            onChange={(event) => onLengthChange(event.target.value)}
          >
            <option value="">Select length</option>
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
          <label>Length Option</label>
          <select
            value={cut.sedmLengthType}
            onChange={(event) =>
              onLengthTypeChange(event.target.value as "min" | "per")
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
            value={cut.sedmHoles || "1"}
            onChange={(event) => onHolesChange(event.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <p className="sedm-meta">
        Quantity: {cut.qty || "0"} | Holes per Piece: {cut.sedmHoles || "1"} | Total Holes: {(Number(cut.qty) || 0) * (Number(cut.sedmHoles) || 1)}
      </p>
      <p className="sedm-amount">
        SEDM Amount: ₹{calculateSedmAmount(cut).toFixed(2)}
      </p>
      <div className="sedm-modal-actions">
        <button
          type="button"
          className="sedm-btn-apply"
          onClick={() => {
            if (onApply) {
              onApply();
            }
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
