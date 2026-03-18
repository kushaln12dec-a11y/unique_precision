import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import { getUserRoleFromToken } from "../../utils/auth";
import { getMasterConfig, updateMasterConfig } from "../../services/masterConfigApi";
import type { MasterConfig } from "../../types/masterConfig";
import { formatMachineLabel, MACHINE_OPTIONS, toMachineIndex } from "../../utils/jobFormatting";
import "../RoleBoard.css";
import "./AdminConsole.css";

const normalizeOptionValue = (input: string): string => input.trim().replace(/\s+/g, " ");

const sanitizeOptions = (values: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeOptionValue(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(normalized);
  });
  return next;
};

const sanitizeMachineOptions = (values: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  values.forEach((value) => {
    const normalized = toMachineIndex(value);
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    next.push(normalized);
  });
  return next.sort((a, b) => Number(a) - Number(b));
};

type AdminSection = "customers" | "materials" | "pass" | "sedm" | "machines" | "hours" | null;

const AdminConsole = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MasterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });

  const [materials, setMaterials] = useState<string[]>([]);
  const [passOptions, setPassOptions] = useState<string[]>([]);
  const [electrodeOptions, setElectrodeOptions] = useState<string[]>([]);
  const [machineOptions, setMachineOptions] = useState<string[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [electrodeInput, setElectrodeInput] = useState("");
  const [machineInput, setMachineInput] = useState("");
  const [customers, setCustomers] = useState<Array<{ customer: string; rate: string }>>([]);

  const isAdmin = useMemo(() => getUserRoleFromToken() === "ADMIN", []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    const load = async () => {
      try {
        const fetched = await getMasterConfig();
        setConfig(fetched);
        setCustomers(fetched.customers);
        setMaterials(sanitizeOptions(fetched.materials));
        setPassOptions(sanitizeOptions(fetched.passOptions));
        setElectrodeOptions(sanitizeOptions(fetched.sedmElectrodeOptions));
        setMachineOptions(
          sanitizeMachineOptions(
            Array.isArray(fetched.machineOptions) && fetched.machineOptions.length > 0
              ? fetched.machineOptions
              : [...MACHINE_OPTIONS]
          )
        );
      } catch {
        setToast({ message: "Failed to load Admin Console data", variant: "error", visible: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin, navigate]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const payload: MasterConfig = {
        customers: customers
          .map((item) => ({ customer: item.customer.trim().toUpperCase(), rate: item.rate.trim() }))
          .filter((item) => item.customer),
        materials: sanitizeOptions(materials),
        passOptions: sanitizeOptions(passOptions),
        sedmElectrodeOptions: sanitizeOptions(electrodeOptions),
        machineOptions: sanitizeMachineOptions(machineOptions),
        sedmThOptions: config.sedmThOptions || [],
        settingHoursPerSetting: Number(config.settingHoursPerSetting) === 0.25 ? 0.25 : 0.5,
        complexExtraHours: Number(config.complexExtraHours) || 1,
        pipExtraHours: Number(config.pipExtraHours) || 1,
      };

      const updated = await updateMasterConfig(payload);
      setConfig(updated);
      setToast({ message: "Admin Console saved", variant: "success", visible: true });
    } catch {
      setToast({ message: "Failed to save Admin Console", variant: "error", visible: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    setActiveSection(null);
  };

  const updateCustomerRow = (index: number, field: "customer" | "rate", value: string) => {
    setCustomers((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: field === "customer" ? value.toUpperCase() : value } : row))
    );
  };

  const addCustomerRow = () => {
    setCustomers((prev) => [...prev, { customer: "", rate: "" }]);
  };

  const removeCustomerRow = (index: number) => {
    setCustomers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addOption = (
    rawValue: string,
    setValue: Dispatch<SetStateAction<string>>,
    setList: Dispatch<SetStateAction<string[]>>,
    emptyMessage: string
  ) => {
    const nextValue = normalizeOptionValue(rawValue);
    if (!nextValue) {
      setToast({ message: emptyMessage, variant: "info", visible: true });
      return;
    }
    setList((prev) => sanitizeOptions([...prev, nextValue]));
    setValue("");
  };

  const removeOption = (index: number, setList: Dispatch<SetStateAction<string[]>>) => {
    setList((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/admin-console" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Admin Console" />
        <div className="roleboard-body admin-console-panel">
          {loading ? (
            <AppLoader message="Loading admin console..." />
          ) : (
            <>
              <div className="admin-mini-card-grid">
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("customers")}>
                  <h4>Customers & Rates</h4>
                  <p>Manage customer code and auto-fill rates.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("materials")}>
                  <h4>Material Options</h4>
                  <p>Add materials one by one and save changes.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("pass")}>
                  <h4>Pass Options</h4>
                  <p>Add pass values one by one and save changes.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("sedm")}>
                  <h4>SEDM Electrode</h4>
                  <p>Add electrode values one by one and save changes.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("machines")}>
                  <h4>Machine Options</h4>
                  <p>Add machine list for Operator assignment (M1, M2...).</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("hours")}>
                  <h4>Hours Config</h4>
                  <p>Base and extra hours for calculations.</p>
                </button>
              </div>
              <div className="admin-console-actions">
                <button type="button" className="btn-primary" disabled={saving || loading} onClick={handleSave}>
                  {saving ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={activeSection === "customers"}
        onClose={() => setActiveSection(null)}
        title="Customers & Rates"
        className="admin-section-modal"
        size="medium"
      >
        <p className="admin-help">Rate auto-fills in Programmer New Job when customer is selected.</p>
        <div className="admin-customer-list">
          {customers.map((item, index) => (
            <div className="admin-customer-row" key={`customer-${index}`}>
              <input
                type="text"
                value={item.customer}
                placeholder="Customer (e.g. UPC001)"
                onChange={(e) => updateCustomerRow(index, "customer", e.target.value)}
              />
              <input
                type="number"
                value={item.rate}
                placeholder="Rate"
                onChange={(e) => updateCustomerRow(index, "rate", e.target.value)}
              />
              <button type="button" className="admin-remove-btn" onClick={() => removeCustomerRow(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-add-btn" onClick={addCustomerRow}>
            Add Customer
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "materials"}
        onClose={() => setActiveSection(null)}
        title="Material Options"
        className="admin-section-modal"
        size="small"
      >
        <label>Add Material</label>
        <div className="admin-option-input-row">
          <input
            type="text"
            value={materialInput}
            placeholder="e.g. SS (Stainless Steel)"
            onChange={(e) => setMaterialInput(e.target.value)}
          />
          <button
            type="button"
            className="admin-add-btn"
            onClick={() => addOption(materialInput, setMaterialInput, setMaterials, "Enter a material value first")}
          >
            Save
          </button>
        </div>
        <div className="admin-option-list">
          {materials.length === 0 ? (
            <p className="admin-empty-text">No material options added yet.</p>
          ) : (
            materials.map((item, index) => (
              <div className="admin-option-row" key={`material-${index}`}>
                <span>{item}</span>
                <button type="button" className="admin-remove-btn" onClick={() => removeOption(index, setMaterials)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "pass"}
        onClose={() => setActiveSection(null)}
        title="Pass Options"
        className="admin-section-modal"
        size="small"
      >
        <label>Add Pass</label>
        <div className="admin-option-input-row">
          <input
            type="text"
            value={passInput}
            placeholder="e.g. 1"
            onChange={(e) => setPassInput(e.target.value)}
          />
          <button
            type="button"
            className="admin-add-btn"
            onClick={() => addOption(passInput, setPassInput, setPassOptions, "Enter a pass value first")}
          >
            Save
          </button>
        </div>
        <div className="admin-option-list">
          {passOptions.length === 0 ? (
            <p className="admin-empty-text">No pass options added yet.</p>
          ) : (
            passOptions.map((item, index) => (
              <div className="admin-option-row" key={`pass-${index}`}>
                <span>{item}</span>
                <button type="button" className="admin-remove-btn" onClick={() => removeOption(index, setPassOptions)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "sedm"}
        onClose={() => setActiveSection(null)}
        title="SEDM Electrode Options"
        className="admin-section-modal"
        size="small"
      >
        <label>Add SEDM Electrode</label>
        <div className="admin-option-input-row">
          <input
            type="text"
            value={electrodeInput}
            placeholder="e.g. 0.3"
            onChange={(e) => setElectrodeInput(e.target.value)}
          />
          <button
            type="button"
            className="admin-add-btn"
            onClick={() =>
              addOption(electrodeInput, setElectrodeInput, setElectrodeOptions, "Enter an electrode value first")
            }
          >
            Save
          </button>
        </div>
        <div className="admin-option-list">
          {electrodeOptions.length === 0 ? (
            <p className="admin-empty-text">No electrode options added yet.</p>
          ) : (
            electrodeOptions.map((item, index) => (
              <div className="admin-option-row" key={`electrode-${index}`}>
                <span>{item}</span>
                <button
                  type="button"
                  className="admin-remove-btn"
                  onClick={() => removeOption(index, setElectrodeOptions)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "machines"}
        onClose={() => setActiveSection(null)}
        title="Machine Options"
        className="admin-section-modal"
        size="small"
      >
        <label>Add Machine</label>
        <div className="admin-option-input-row">
          <input
            type="text"
            value={machineInput}
            placeholder="e.g. M1 or 1"
            onChange={(e) => setMachineInput(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="admin-add-btn"
            onClick={() => {
              const normalized = toMachineIndex(machineInput);
              if (!normalized) {
                setToast({ message: "Enter a valid machine value (e.g. M1)", variant: "info", visible: true });
                return;
              }
              setMachineOptions((prev) => sanitizeMachineOptions([...prev, normalized]));
              setMachineInput("");
            }}
          >
            Save
          </button>
        </div>
        <div className="admin-option-list">
          {machineOptions.length === 0 ? (
            <p className="admin-empty-text">No machine options added yet.</p>
          ) : (
            machineOptions.map((item, index) => (
              <div className="admin-option-row" key={`machine-${index}`}>
                <span>{formatMachineLabel(item)}</span>
                <button type="button" className="admin-remove-btn" onClick={() => removeOption(index, setMachineOptions)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "hours"}
        onClose={() => setActiveSection(null)}
        title="Hours Configuration"
        className="admin-section-modal"
        size="small"
      >
        <div className="admin-hours-grid">
          <label>
            Setting Hrs
            <select
              value={Number(config?.settingHoursPerSetting) === 0.25 ? "0.25" : "0.5"}
              onChange={(e) =>
                setConfig((prev) =>
                  prev ? { ...prev, settingHoursPerSetting: e.target.value === "0.25" ? 0.25 : 0.5 } : prev
                )
              }
            >
              <option value="0.5">0.5</option>
              <option value="0.25">0.25</option>
            </select>
          </label>
          <label>
            Complex Extra Hrs
            <input
              type="number"
              step="0.1"
              value={config?.complexExtraHours ?? 1}
              onChange={(e) =>
                setConfig((prev) => (prev ? { ...prev, complexExtraHours: Number(e.target.value) || 0 } : prev))
              }
            />
          </label>
          <label>
            PIP Extra Hrs
            <input
              type="number"
              step="0.1"
              value={config?.pipExtraHours ?? 1}
              onChange={(e) =>
                setConfig((prev) => (prev ? { ...prev, pipExtraHours: Number(e.target.value) || 0 } : prev))
              }
            />
          </label>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default AdminConsole;
