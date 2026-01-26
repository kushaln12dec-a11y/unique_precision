import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CutForm } from "./programmerUtils";
import { DEFAULT_CUT } from "./programmerUtils";

type CutTotals = {
  totalHrs: number;
  totalAmount: number;
};

type ProgrammerJobFormProps = {
  cuts: CutForm[];
  setCuts: Dispatch<SetStateAction<CutForm[]>>;
  onSave: () => void;
  onCancel: () => void;
  totals: CutTotals[];
  isAdmin: boolean;
};

const ProgrammerJobForm = ({
  cuts,
  setCuts,
  onSave,
  onCancel,
  totals,
  isAdmin,
}: ProgrammerJobFormProps) => {
  const [collapsedCuts, setCollapsedCuts] = useState<Set<number>>(new Set());

  const toggleCut = (index: number) => {
    if (index === 0) return;
    setCollapsedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCutChange =
    <K extends keyof CutForm>(index: number, field: K) =>
    (value: CutForm[K]) => {
      setCuts((prev) =>
        prev.map((cut, idx) => (idx === index ? { ...cut, [field]: value } : cut))
      );
    };

  const addCut = () => {
    setCuts((prev) => [...prev, { ...DEFAULT_CUT }]);
  };

  const removeCut = (index: number) => {
    setCuts((prev) => prev.filter((_, idx) => idx !== index));
    setCollapsedCuts((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleCutImageChange = (index: number, file?: File | null) => {
    if (!file) {
      handleCutChange(index, "cutImage")(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleCutChange(index, "cutImage")(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const cutLabels = useMemo(
    () => cuts.map((_, index) => `Cut ${index + 1}`),
    [cuts]
  );

  return (
    <div className="job-form-card">
      <div className="job-form-grid">
        <div className="cut-actions">
          <button className="btn-new-job btn-add-cut" onClick={addCut}>
            Add new cut length
          </button>
        </div>

        {cuts.map((cut, index) => {
          const isCollapsed = index === 0 ? false : collapsedCuts.has(index);
          const cutTotals = totals[index] ?? { totalHrs: 0, totalAmount: 0 };

          return (
            <div
              key={`cut-${index}`}
              className={`cut-section ${isCollapsed ? "collapsed" : ""}`}
            >
              <div className="cut-section-header">
                <span>{cutLabels[index]}</span>
                <div className="cut-section-header-right">
                  <label className="header-checkbox">
                    <input
                      type="checkbox"
                      checked={cut.critical}
                      onChange={(e) =>
                        handleCutChange(index, "critical")(e.target.checked)
                      }
                    />
                    Critical
                  </label>
                  <label className="header-checkbox">
                    <input
                      type="checkbox"
                      checked={cut.pipFinish}
                      onChange={(e) =>
                        handleCutChange(index, "pipFinish")(e.target.checked)
                      }
                    />
                    PIP Finish
                  </label>
                  <div className="priority-dropdown compact">
                    <select
                      className="priority-trigger"
                      value={cut.priority}
                      onChange={(e) =>
                        handleCutChange(index, "priority")(
                          e.target.value as CutForm["priority"]
                        )
                      }
                      aria-label="Priority"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      className="cut-remove"
                      onClick={() => removeCut(index)}
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    className="cut-toggle-button"
                    onClick={() => toggleCut(index)}
                    disabled={index === 0}
                    aria-label={isCollapsed ? "Expand cut" : "Collapse cut"}
                  >
                    {isCollapsed ? "+" : "–"}
                  </button>
                </div>
              </div>
              <div className="cut-section-body">
                <div className="job-form-image">
                  {cut.cutImage ? (
                    <img src={cut.cutImage} alt={`${cutLabels[index]} preview`} />
                  ) : (
                    <span className="image-placeholder">Upload Image</span>
                  )}
                  <input
                    className="image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCutImageChange(index, e.target.files?.[0])}
                    aria-label={`Upload image for ${cutLabels[index]}`}
                  />
                </div>
                <div className="cut-section-grid">
                  <div className="input-pair">
                    <label>Customer</label>
                    <select
                      value={cut.customer}
                      onChange={(e) =>
                        handleCutChange(index, "customer")(e.target.value)
                      }
                    >
                      <option value="">Select Customer</option>
                      <option value="UPC001">UPC001</option>
                      <option value="UPC002">UPC002</option>
                      <option value="UPC003">UPC003</option>
                      <option value="UPC004">UPC004</option>
                      <option value="UPC005">UPC005</option>
                    </select>
                  </div>
                  <div className="input-pair">
                    <label>Rate (₹/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cut.rate}
                      onChange={(e) =>
                        handleCutChange(index, "rate")(e.target.value)
                      }
                    />
                  </div>
                  <div className="input-pair">
                    <label>Cut Length (mm)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={cut.cut}
                      onChange={(e) =>
                        handleCutChange(index, "cut")(e.target.value)
                      }
                    />
                  </div>
                  <div className="input-pair">
                    <label>Thickness (mm)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={cut.thickness}
                      onChange={(e) =>
                        handleCutChange(index, "thickness")(e.target.value)
                      }
                    />
                  </div>
                  <div className="input-pair">
                    <label>Pass</label>
                    <select
                      value={cut.passLevel}
                      onChange={(e) =>
                        handleCutChange(index, "passLevel")(e.target.value)
                      }
                    >
                      <option value="1">1.0x</option>
                      <option value="2">1.5x</option>
                      <option value="3">1.75x</option>
                      <option value="4">2.0x</option>
                      <option value="5">2.5x</option>
                      <option value="6">2.75x</option>
                    </select>
                  </div>
                  <div className="input-pair">
                    <label>Setting Level</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cut.setting}
                      onChange={(e) =>
                        handleCutChange(index, "setting")(e.target.value)
                      }
                    />
                  </div>
                  <div className="input-pair">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={cut.qty}
                      onChange={(e) =>
                        handleCutChange(index, "qty")(e.target.value)
                      }
                    />
                  </div>
                  <div className="input-pair">
                    <label>SEDM</label>
                    <select
                      value={cut.sedm}
                      onChange={(e) =>
                        handleCutChange(index, "sedm")(
                          e.target.value as CutForm["sedm"]
                        )
                      }
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  {isAdmin && (
                    <>
                      <div className="input-pair">
                        <label>Total Hrs/Piece</label>
                        <input
                          type="text"
                          value={cutTotals.totalHrs.toFixed(3)}
                          readOnly
                        />
                      </div>
                      <div className="input-pair">
                        <label>Total Amount (₹)</label>
                        <input
                          type="text"
                          value={cutTotals.totalAmount.toFixed(2)}
                          readOnly
                        />
                      </div>
                    </>
                  )}
                  <div className="input-pair description-box">
                    <label>Description</label>
                    <textarea
                      rows={6}
                      value={cut.description}
                      onChange={(e) =>
                        handleCutChange(index, "description")(
                          e.target.value.toUpperCase()
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <button className="btn-success" onClick={onSave}>
          Save Job
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ProgrammerJobForm;
