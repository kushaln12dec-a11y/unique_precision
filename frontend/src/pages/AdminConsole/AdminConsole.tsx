import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import Toast from "../../components/Toast";
import { getUserRoleFromToken } from "../../utils/auth";
import { getMasterConfig, updateMasterConfig } from "../../services/masterConfigApi";
import type { MasterConfig } from "../../types/masterConfig";
import "../RoleBoard.css";
import "./AdminConsole.css";

const parseCsv = (input: string): string[] =>
  input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

type AdminSection = "customers" | "materials" | "pass" | "sedm" | "hours" | null;

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

  const [materialsText, setMaterialsText] = useState("");
  const [passText, setPassText] = useState("");
  const [electrodeText, setElectrodeText] = useState("");
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
        setMaterialsText(fetched.materials.join(", "));
        setPassText(fetched.passOptions.join(", "));
        setElectrodeText(fetched.sedmElectrodeOptions.join(", "));
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
        materials: parseCsv(materialsText),
        passOptions: parseCsv(passText),
        sedmElectrodeOptions: parseCsv(electrodeText),
        sedmThOptions: config.sedmThOptions || [],
        settingHoursPerSetting: Number(config.settingHoursPerSetting) || 0.5,
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

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/admin-console" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Admin Console" />
        <div className="roleboard-body admin-console-panel">
          <h3>Admin Console</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="admin-mini-card-grid">
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("customers")}>
                  <h4>Customers & Rates</h4>
                  <p>Manage customer code and auto-fill rates.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("materials")}>
                  <h4>Material Options</h4>
                  <p>Comma-separated material dropdown values.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("pass")}>
                  <h4>Pass Options</h4>
                  <p>Configure available pass values.</p>
                </button>
                <button type="button" className="admin-mini-card" onClick={() => setActiveSection("sedm")}>
                  <h4>SEDM Electrode</h4>
                  <p>Configure electrode dropdown list.</p>
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
        <label>Material (comma-separated)</label>
        <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={5} />
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
        <label>Pass (comma-separated)</label>
        <textarea value={passText} onChange={(e) => setPassText(e.target.value)} rows={4} />
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
        <label>SEDM Electrode (comma-separated)</label>
        <textarea value={electrodeText} onChange={(e) => setElectrodeText(e.target.value)} rows={5} />
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
            <input
              type="number"
              step="0.1"
              value={config?.settingHoursPerSetting ?? 0.5}
              onChange={(e) =>
                setConfig((prev) =>
                  prev ? { ...prev, settingHoursPerSetting: Number(e.target.value) || 0 } : prev
                )
              }
            />
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
