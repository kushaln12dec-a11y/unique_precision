import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
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

const AdminConsole = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MasterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });

  const [materialsText, setMaterialsText] = useState("");
  const [passText, setPassText] = useState("");
  const [electrodeText, setElectrodeText] = useState("");
  const [thOptionText, setThOptionText] = useState("");
  const [customers, setCustomers] = useState<Array<{ customer: string; rate: string }>>([]);
  const [settingHoursPerSetting, setSettingHoursPerSetting] = useState("0.5");
  const [complexExtraHours, setComplexExtraHours] = useState("1");
  const [pipExtraHours, setPipExtraHours] = useState("1");

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
        setThOptionText(fetched.sedmThOptions.map((opt) => `${opt.value}|${opt.label}`).join("\n"));
        setSettingHoursPerSetting(String(fetched.settingHoursPerSetting ?? 0.5));
        setComplexExtraHours(String(fetched.complexExtraHours ?? 1));
        setPipExtraHours(String(fetched.pipExtraHours ?? 1));
      } catch (error) {
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
      const sedmThOptions = thOptionText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [value, label] = line.split("|").map((v) => v.trim());
          return { value: value || "", label: label || value || "" };
        })
        .filter((item) => item.value && item.label);

      const payload: MasterConfig = {
        customers: customers
          .map((item) => ({ customer: item.customer.trim(), rate: item.rate.trim() }))
          .filter((item) => item.customer),
        materials: parseCsv(materialsText),
        passOptions: parseCsv(passText),
        sedmElectrodeOptions: parseCsv(electrodeText),
        sedmThOptions,
        settingHoursPerSetting: Number(settingHoursPerSetting) || 0.5,
        complexExtraHours: Number(complexExtraHours) || 1,
        pipExtraHours: Number(pipExtraHours) || 1,
      };

      const updated = await updateMasterConfig(payload);
      setConfig(updated);
      setToast({ message: "Admin Console saved", variant: "success", visible: true });
    } catch (error) {
      setToast({ message: "Failed to save Admin Console", variant: "error", visible: true });
    } finally {
      setSaving(false);
    }
  };

  const updateCustomerRow = (index: number, field: "customer" | "rate", value: string) => {
    setCustomers((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
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
            <div className="admin-console-grid">
              <section className="admin-card">
                <h4>Customers and Rates</h4>
                <p className="admin-help">Rate auto-fills in Programmer New Job when customer is selected.</p>
                <div className="admin-customer-list">
                  {customers.map((item, index) => (
                    <div className="admin-customer-row" key={`customer-${index}`}>
                      <input
                        type="text"
                        value={item.customer}
                        placeholder="Customer (e.g. UPC001)"
                        onChange={(e) => updateCustomerRow(index, "customer", e.target.value.toUpperCase())}
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
                <button type="button" className="admin-add-btn" onClick={addCustomerRow}>
                  Add Customer
                </button>
              </section>

              <section className="admin-card">
                <h4>Master Dropdown Values</h4>
                <label>Material (comma-separated)</label>
                <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={3} />

                <label>Pass (comma-separated)</label>
                <textarea value={passText} onChange={(e) => setPassText(e.target.value)} rows={2} />

                <label>SEDM Electrode (comma-separated)</label>
                <textarea value={electrodeText} onChange={(e) => setElectrodeText(e.target.value)} rows={3} />

                <label>SEDM TH Option (one per line: value|label)</label>
                <textarea value={thOptionText} onChange={(e) => setThOptionText(e.target.value)} rows={3} />
              </section>

              <section className="admin-card">
                <h4>Calculation Hours</h4>
                <div className="admin-hours-grid">
                  <label>
                    Setting hour multiplier
                    <input
                      type="number"
                      step="0.1"
                      value={settingHoursPerSetting}
                      onChange={(e) => setSettingHoursPerSetting(e.target.value)}
                    />
                  </label>
                  <label>
                    Complex extra hours
                    <input
                      type="number"
                      step="0.1"
                      value={complexExtraHours}
                      onChange={(e) => setComplexExtraHours(e.target.value)}
                    />
                  </label>
                  <label>
                    PIP extra hours
                    <input
                      type="number"
                      step="0.1"
                      value={pipExtraHours}
                      onChange={(e) => setPipExtraHours(e.target.value)}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
          <div className="admin-console-actions">
            <button type="button" className="btn-primary" disabled={saving || loading} onClick={handleSave}>
              {saving ? "Saving..." : "Save Admin Console"}
            </button>
          </div>
        </div>
      </div>
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

