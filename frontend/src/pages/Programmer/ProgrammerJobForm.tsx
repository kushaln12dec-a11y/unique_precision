import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CutForm } from "./programmerUtils";
import { DustbinIcon } from "../../utils/icons";
import { DEFAULT_CUT } from "./programmerUtils";
import SEDMModal from "./components/SEDMModal";
import ImageUpload from "./components/ImageUpload";
import { FormInput } from "./components/FormInput";

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
  const [sedmModalIndex, setSedmModalIndex] = useState<number | null>(null);
  const [savedCuts, setSavedCuts] = useState<Set<number>>(new Set());
  const [cutValidationErrors, setCutValidationErrors] = useState<
    Record<number, Record<string, string>>
  >({});

  useEffect(() => {
    // Remove saved/validation state for cuts that no longer exist
    setSavedCuts((prev) => {
      const next = new Set<number>();
      cuts.forEach((_, index) => {
        if (prev.has(index)) next.add(index);
      });
      return next;
    });
    setCutValidationErrors((prev) => {
      const next: Record<number, Record<string, string>> = {};
      cuts.forEach((_, index) => {
        if (prev[index]) {
          next[index] = prev[index];
        }
      });
      return next;
    });
  }, [cuts]);

  useEffect(() => {
    const primaryCustomer = cuts[0]?.customer ?? "";
    if (!primaryCustomer || cuts.length <= 1) return;
    setCuts((prev) =>
      prev.map((cut, idx) =>
        idx === 0 || cut.customer === primaryCustomer
          ? cut
          : { ...cut, customer: primaryCustomer }
      )
    );
  }, [cuts.length, cuts[0]?.customer, setCuts]);

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
      // Any change makes the cut "unsaved" again
      setSavedCuts((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
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

  const handleSedmChange = (index: number, value: CutForm["sedm"]) => {
    handleCutChange(index, "sedm")(value);
    if (value === "Yes") {
      setSedmModalIndex(index);
    } else if (sedmModalIndex === index) {
      setSedmModalIndex(null);
    }
  };

  const closeSedmModal = () => {
    setSedmModalIndex(null);
  };

  const cutLabels = useMemo(
    () => cuts.map((_, index) => `Cut ${index + 1}`),
    [cuts]
  );

  const validateCut = (cut: CutForm): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!cut.customer) errors.customer = "Customer is required.";
    if (!cut.rate) errors.rate = "Rate is required.";
    if (!cut.cut) errors.cut = "Cut length is required.";
    if (!cut.thickness) errors.thickness = "Thickness is required.";
    if (!cut.passLevel) errors.passLevel = "Pass is required.";
    if (!cut.setting) errors.setting = "Setting level is required.";
    if (!cut.qty) errors.qty = "Quantity is required.";
    if (!cut.priority) errors.priority = "Priority is required.";
    if (!cut.description.trim()) errors.description = "Description is required.";
    if (cut.sedm === "Yes" && !cut.sedmLengthValue) {
      errors.sedmLengthValue = "SEDM length is required when SEDM is Yes.";
    }
    return errors;
  };

  const handleSaveCut = (index: number) => {
    const cut = cuts[index];
    if (!cut) return;
    const errors = validateCut(cut);
    if (Object.keys(errors).length > 0) {
      setCutValidationErrors((prev) => ({
        ...prev,
        [index]: errors,
      }));
      setSavedCuts((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      return;
    }

    setCutValidationErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    setSavedCuts((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const allCutsSaved =
    cuts.length > 0 && cuts.every((_, index) => savedCuts.has(index));

  const grandTotals = useMemo(() => {
    return totals.reduce(
      (acc, current) => ({
        totalHrs: acc.totalHrs + current.totalHrs,
        totalAmount: acc.totalAmount + current.totalAmount,
      }),
      { totalHrs: 0, totalAmount: 0 }
    );
  }, [totals]);

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
          const isSaved = savedCuts.has(index);
          const fieldErrors = cutValidationErrors[index] ?? {};

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
                  <span
                    className={`cut-save-status ${
                      isSaved ? "cut-save-status-saved" : "cut-save-status-pending"
                    }`}
                  >
                    {isSaved ? "Saved" : "Not saved"}
                  </span>
                  {index > 0 && (
                    <button
                      type="button"
                      className="cut-remove"
                      onClick={() => removeCut(index)}
                      aria-label={`Delete ${cutLabels[index]}`}
                    >
                      <DustbinIcon fontSize="small" />
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
                <ImageUpload
                  image={cut.cutImage}
                  label={cutLabels[index]}
                  onImageChange={(file) => handleCutImageChange(index, file)}
                  onRemove={() => handleCutImageChange(index, null)}
                />
                <div className="cut-section-grid">
                  <FormInput
                    label="Customer"
                    error={fieldErrors.customer}
                    required
                  >
                    <select
                      value={index === 0 ? cut.customer : cuts[0]?.customer ?? ""}
                      onChange={(e) =>
                        handleCutChange(index, "customer")(e.target.value)
                      }
                      disabled={index > 0}
                      required
                    >
                      <option value="">Select Customer</option>
                      <option value="UPC001">UPC001</option>
                      <option value="UPC002">UPC002</option>
                      <option value="UPC003">UPC003</option>
                      <option value="UPC004">UPC004</option>
                      <option value="UPC005">UPC005</option>
                    </select>
                  </FormInput>
                  <FormInput label="Rate (₹/hr)" error={fieldErrors.rate} required>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cut.rate}
                      onChange={(e) =>
                        handleCutChange(index, "rate")(e.target.value)
                      }
                      required
                    />
                  </FormInput>
                  <FormInput
                    label="Cut Length (mm)"
                    error={fieldErrors.cut}
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={cut.cut}
                      onChange={(e) =>
                        handleCutChange(index, "cut")(e.target.value)
                      }
                      required
                    />
                  </FormInput>
                  <FormInput
                    label="Thickness (mm)"
                    error={fieldErrors.thickness}
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={cut.thickness}
                      onChange={(e) =>
                        handleCutChange(index, "thickness")(e.target.value)
                      }
                      required
                    />
                  </FormInput>
                  <FormInput label="Pass" error={fieldErrors.passLevel} required>
                    <select
                      value={cut.passLevel}
                      onChange={(e) =>
                        handleCutChange(index, "passLevel")(e.target.value)
                      }
                      required
                    >
                      <option value="1">1.0x</option>
                      <option value="2">1.5x</option>
                      <option value="3">1.75x</option>
                      <option value="4">2.0x</option>
                      <option value="5">2.5x</option>
                      <option value="6">2.75x</option>
                    </select>
                  </FormInput>
                  <FormInput
                    label="Setting Level"
                    error={fieldErrors.setting}
                    required
                  >
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cut.setting}
                      onChange={(e) =>
                        handleCutChange(index, "setting")(e.target.value)
                      }
                      required
                    />
                  </FormInput>
                  <FormInput label="Quantity" error={fieldErrors.qty} required>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={cut.qty}
                      onChange={(e) =>
                        handleCutChange(index, "qty")(e.target.value)
                      }
                      required
                    />
                  </FormInput>
                  <FormInput
                    label="SEDM"
                    error={
                      fieldErrors.sedmLengthValue && cut.sedm === "Yes"
                        ? fieldErrors.sedmLengthValue
                        : undefined
                    }
                    required
                  >
                    <select
                      value={cut.sedm}
                      onChange={(e) =>
                        handleSedmChange(index, e.target.value as CutForm["sedm"])
                      }
                      required
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    {cut.sedm === "Yes" && (
                      <button
                        type="button"
                        className="sedm-config-button"
                        onClick={() => setSedmModalIndex(index)}
                      >
                        Configure SEDM
                      </button>
                    )}
                  </FormInput>
                  {isAdmin && (
                    <>
                      <FormInput label="Total Hrs/Piece">
                        <input
                          type="text"
                          value={cutTotals.totalHrs.toFixed(3)}
                          readOnly
                        />
                      </FormInput>
                      <FormInput label="Total Amount (₹)">
                        <input
                          type="text"
                          value={cutTotals.totalAmount.toFixed(2)}
                          readOnly
                        />
                      </FormInput>
                    </>
                  )}
                  <FormInput
                    label="Description"
                    error={fieldErrors.description}
                    required
                    className="description-box"
                  >
                    <textarea
                      rows={6}
                      value={cut.description}
                      placeholder="Enter description"
                      onChange={(e) =>
                        handleCutChange(index, "description")(
                          e.target.value.toUpperCase()
                        )
                      }
                      required
                    />
                  </FormInput>
                </div>
                <div className="cut-section-actions">
                  <button
                    type="button"
                    className="btn-success small"
                    onClick={() => handleSaveCut(index)}
                  >
                    Save Cut
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <div className="form-totals">
          <div>
            <span className="form-total-label">Total Hrs/Piece</span>
            <span className="form-total-value">{grandTotals.totalHrs.toFixed(3)}</span>
          </div>
          <div>
            <span className="form-total-label">Total Amount (₹)</span>
            <span className="form-total-value">{grandTotals.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="form-action-buttons">
          <button
            className="btn-success"
            onClick={onSave}
            disabled={!allCutsSaved}
          >
            Save Job
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      {sedmModalIndex !== null && cuts[sedmModalIndex] && (
        <SEDMModal
          isOpen={true}
          onClose={closeSedmModal}
          cut={cuts[sedmModalIndex]}
          onLengthChange={(value) =>
            handleCutChange(sedmModalIndex, "sedmLengthValue")(value)
          }
          onLengthTypeChange={(value) =>
            handleCutChange(sedmModalIndex, "sedmLengthType")(value)
          }
          onHolesChange={(value) =>
            handleCutChange(sedmModalIndex, "sedmHoles")(value)
          }
          onApply={() => {
            // Apply button clicked - modal will close automatically
            // The changes are already applied via onLengthChange, onLengthTypeChange, and onHolesChange
          }}
        />
      )}
    </div>
  );
};

export default ProgrammerJobForm;
