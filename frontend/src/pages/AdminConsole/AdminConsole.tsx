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
import type { CustomerRate, MasterConfig } from "../../types/masterConfig";
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
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    next.push(normalized);
  });
  return next.sort((a, b) => Number(a) - Number(b));
};

const DEFAULT_CUSTOMERS: CustomerRate[] = [
  { customer: "UPC001", rate: "100", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC002", rate: "10", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC003", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC004", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
  { customer: "UPC005", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
];

const normalizeCustomerRows = (values: CustomerRate[]): CustomerRate[] => {
  const unique = new Map<string, CustomerRate>();
  values.forEach((item) => {
    const customer = String(item.customer || "").trim().toUpperCase();
    if (!customer) return;
    unique.set(customer, {
      customer,
      rate: String(item.rate || "").trim(),
      settingHours: String(item.settingHours || "").trim(),
      thicknessRateUpto100: String(item.thicknessRateUpto100 || "").trim(),
      thicknessRateAbove100: String(item.thicknessRateAbove100 || "").trim(),
    });
  });
  return Array.from(unique.values());
};

const serialize = (value: unknown) => JSON.stringify(value);

type AdminSection = "customers" | "materials" | "pass" | "sedm" | "machines" | "hours" | "thickness" | null;

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
  const [customers, setCustomers] = useState<CustomerRate[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [electrodeInput, setElectrodeInput] = useState("");
  const [machineInput, setMachineInput] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<{
    customers: CustomerRate[];
    materials: string[];
    passOptions: string[];
    electrodeOptions: string[];
    machineOptions: string[];
    hoursConfig: Pick<MasterConfig, "settingHoursPerSetting" | "complexExtraHours" | "pipExtraHours"> | null;
    thicknessConfig: Pick<MasterConfig, "thicknessRateUpto100" | "thicknessRateAbove100"> | null;
  }>({
    customers: [],
    materials: [],
    passOptions: [],
    electrodeOptions: [],
    machineOptions: [],
    hoursConfig: null,
    thicknessConfig: null,
  });

  const isAdmin = useMemo(() => getUserRoleFromToken() === "ADMIN", []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    const load = async () => {
      try {
        const fetched = await getMasterConfig();
        const normalizedCustomers = normalizeCustomerRows(
          fetched.customers.length > 0 ? fetched.customers : DEFAULT_CUSTOMERS
        );
        const normalizedMaterials = sanitizeOptions(fetched.materials);
        const normalizedPassOptions = sanitizeOptions(fetched.passOptions);
        const normalizedElectrodeOptions = sanitizeOptions(fetched.sedmElectrodeOptions);
        const normalizedMachineOptions = sanitizeMachineOptions(
          Array.isArray(fetched.machineOptions) && fetched.machineOptions.length > 0
            ? fetched.machineOptions
            : [...MACHINE_OPTIONS]
        );

        setConfig(fetched);
        setCustomers(normalizedCustomers);
        setMaterials(normalizedMaterials);
        setPassOptions(normalizedPassOptions);
        setElectrodeOptions(normalizedElectrodeOptions);
        setMachineOptions(normalizedMachineOptions);
        setSavedSnapshot({
          customers: normalizedCustomers,
          materials: normalizedMaterials,
          passOptions: normalizedPassOptions,
          electrodeOptions: normalizedElectrodeOptions,
          machineOptions: normalizedMachineOptions,
          hoursConfig: {
            settingHoursPerSetting: Number(fetched.settingHoursPerSetting) === 0.25 ? 0.25 : 0.5,
            complexExtraHours: Number(fetched.complexExtraHours) || 1,
            pipExtraHours: Number(fetched.pipExtraHours) || 1,
          },
          thicknessConfig: {
            thicknessRateUpto100: Number(fetched.thicknessRateUpto100) || 1500,
            thicknessRateAbove100: Number(fetched.thicknessRateAbove100) || 1200,
          },
        });
      } catch {
        setToast({ message: "Failed to load Admin Console data", variant: "error", visible: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin, navigate]);

  const normalizedCustomers = useMemo(() => normalizeCustomerRows(customers), [customers]);
  const normalizedMaterials = useMemo(() => sanitizeOptions(materials), [materials]);
  const normalizedPassOptions = useMemo(() => sanitizeOptions(passOptions), [passOptions]);
  const normalizedElectrodeOptions = useMemo(() => sanitizeOptions(electrodeOptions), [electrodeOptions]);
  const normalizedMachineOptions = useMemo(() => sanitizeMachineOptions(machineOptions), [machineOptions]);
  const normalizedHoursConfig = useMemo(
    () => ({
      settingHoursPerSetting: Number(config?.settingHoursPerSetting) === 0.25 ? 0.25 : 0.5,
      complexExtraHours: Number(config?.complexExtraHours) || 1,
      pipExtraHours: Number(config?.pipExtraHours) || 1,
    }),
    [config?.complexExtraHours, config?.pipExtraHours, config?.settingHoursPerSetting]
  );
  const normalizedThicknessConfig = useMemo(
    () => ({
      thicknessRateUpto100: Number(config?.thicknessRateUpto100) || 1500,
      thicknessRateAbove100: Number(config?.thicknessRateAbove100) || 1200,
    }),
    [config?.thicknessRateAbove100, config?.thicknessRateUpto100]
  );

  const sectionDirty = useMemo(
    () => ({
      customers: serialize(normalizedCustomers) !== serialize(savedSnapshot.customers),
      materials: serialize(normalizedMaterials) !== serialize(savedSnapshot.materials),
      pass: serialize(normalizedPassOptions) !== serialize(savedSnapshot.passOptions),
      sedm: serialize(normalizedElectrodeOptions) !== serialize(savedSnapshot.electrodeOptions),
      machines: serialize(normalizedMachineOptions) !== serialize(savedSnapshot.machineOptions),
      hours: serialize(normalizedHoursConfig) !== serialize(savedSnapshot.hoursConfig),
      thickness: serialize(normalizedThicknessConfig) !== serialize(savedSnapshot.thicknessConfig),
    }),
    [
      normalizedCustomers,
      normalizedMaterials,
      normalizedPassOptions,
      normalizedElectrodeOptions,
      normalizedMachineOptions,
      normalizedHoursConfig,
      normalizedThicknessConfig,
      savedSnapshot,
    ]
  );

  const disableSaveAll = saving || loading || activeSection !== null;

  const persistSnapshot = (nextConfig: MasterConfig) => {
    setSavedSnapshot({
      customers: normalizeCustomerRows(nextConfig.customers),
      materials: sanitizeOptions(nextConfig.materials),
      passOptions: sanitizeOptions(nextConfig.passOptions),
      electrodeOptions: sanitizeOptions(nextConfig.sedmElectrodeOptions),
      machineOptions: sanitizeMachineOptions(nextConfig.machineOptions),
      hoursConfig: {
        settingHoursPerSetting: Number(nextConfig.settingHoursPerSetting) === 0.25 ? 0.25 : 0.5,
        complexExtraHours: Number(nextConfig.complexExtraHours) || 1,
        pipExtraHours: Number(nextConfig.pipExtraHours) || 1,
      },
      thicknessConfig: {
        thicknessRateUpto100: Number(nextConfig.thicknessRateUpto100) || 1500,
        thicknessRateAbove100: Number(nextConfig.thicknessRateAbove100) || 1200,
      },
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const payload: MasterConfig = {
        customers: normalizedCustomers,
        materials: normalizedMaterials,
        passOptions: normalizedPassOptions,
        sedmElectrodeOptions: normalizedElectrodeOptions,
        machineOptions: normalizedMachineOptions,
        sedmThOptions: config.sedmThOptions || [],
        settingHoursPerSetting: normalizedHoursConfig.settingHoursPerSetting,
        thicknessRateUpto100: normalizedThicknessConfig.thicknessRateUpto100,
        thicknessRateAbove100: normalizedThicknessConfig.thicknessRateAbove100,
        complexExtraHours: normalizedHoursConfig.complexExtraHours,
        pipExtraHours: normalizedHoursConfig.pipExtraHours,
      };

      const updated = await updateMasterConfig(payload);
      setConfig(updated);
      setCustomers(normalizeCustomerRows(updated.customers));
      setMaterials(sanitizeOptions(updated.materials));
      setPassOptions(sanitizeOptions(updated.passOptions));
      setElectrodeOptions(sanitizeOptions(updated.sedmElectrodeOptions));
      setMachineOptions(sanitizeMachineOptions(updated.machineOptions));
      persistSnapshot(updated);
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

  const updateCustomerRow = (
    index: number,
    field: keyof CustomerRate,
    value: string
  ) => {
    setCustomers((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: field === "customer" ? value.toUpperCase() : value,
            }
          : row
      )
    );
  };

  const addCustomerRow = () => {
    setCustomers((prev) => [
      ...prev,
      {
        customer: "",
        rate: "",
        settingHours: "",
        thicknessRateUpto100: "",
        thicknessRateAbove100: "",
      },
    ]);
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

  const summaryCards = [
    {
      title: "Customers & Rates",
      value: `${normalizedCustomers.length} customer profiles`,
      detail: "Customer rate and customer-specific setting hrs stay together.",
      dirty: sectionDirty.customers,
      onClick: () => setActiveSection("customers"),
    },
    {
      title: "Thickness Pricing",
      value: `${normalizedThicknessConfig.thicknessRateUpto100} / ${normalizedThicknessConfig.thicknessRateAbove100}`,
      detail: "Global pricing divisor for thickness <= 100 and > 100.",
      dirty: sectionDirty.thickness,
      onClick: () => setActiveSection("thickness"),
    },
    {
      title: "Material Options",
      value: `${normalizedMaterials.length} material presets`,
      detail: "Used in Programmer forms and standardizes entries.",
      dirty: sectionDirty.materials,
      onClick: () => setActiveSection("materials"),
    },
    {
      title: "Pass Options",
      value: `${normalizedPassOptions.length} pass presets`,
      detail: "Controls pass dropdown values in the job form.",
      dirty: sectionDirty.pass,
      onClick: () => setActiveSection("pass"),
    },
    {
      title: "SEDM Electrode",
      value: `${normalizedElectrodeOptions.length} electrode options`,
      detail: "Keeps SEDM selection fast and consistent.",
      dirty: sectionDirty.sedm,
      onClick: () => setActiveSection("sedm"),
    },
    {
      title: "Machine Options",
      value: `${normalizedMachineOptions.length} machine slots`,
      detail: "Feeds the Operator Mach # dropdowns.",
      dirty: sectionDirty.machines,
      onClick: () => setActiveSection("machines"),
    },
    {
      title: "Hours Config",
      value: `${normalizedHoursConfig.settingHoursPerSetting} base setting hrs`,
      detail: "Global extras still apply across Programmer calculations.",
      dirty: sectionDirty.hours,
      onClick: () => setActiveSection("hours"),
    },
  ];

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/admin-console" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content admin-console-content">
        <Header title="Admin Console" />
        <div className="roleboard-body admin-console-panel">
          {loading ? (
            <AppLoader message="Loading admin console..." />
          ) : (
            <>
              <div className="admin-mini-card-grid">
                {summaryCards.map((card) => (
                  <button key={card.title} type="button" className="admin-mini-card" onClick={card.onClick}>
                    <div className="admin-mini-card-head">
                      <h4>{card.title}</h4>
                      {card.dirty && <span className="admin-dirty-pill">Unsaved</span>}
                    </div>
                    <strong>{card.value}</strong>
                    <p>{card.detail}</p>
                  </button>
                ))}
              </div>

              <div className="admin-console-actions">
                <button type="button" className="btn-primary" disabled={disableSaveAll} onClick={handleSave}>
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
        className="admin-section-modal admin-customer-modal"
        size="large"
      >
        <p className="admin-help">
          Programmer reads these values per customer. Default Setting Hrs stays global, and you can override Setting
          Hrs plus thickness pricing here for a specific customer when needed.
        </p>
        <div className="admin-customer-list">
          {customers.map((item, index) => (
            <div className="admin-customer-row admin-customer-row-simple" key={`customer-${index}`}>
              <input
                type="text"
                value={item.customer}
                placeholder="Customer"
                onChange={(e) => updateCustomerRow(index, "customer", e.target.value)}
              />
              <input
                type="number"
                value={item.rate}
                placeholder="Rate"
                onChange={(e) => updateCustomerRow(index, "rate", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                value={item.settingHours}
                placeholder="Setting Hrs"
                onChange={(e) => updateCustomerRow(index, "settingHours", e.target.value)}
              />
              <input
                type="number"
                value={item.thicknessRateUpto100}
                placeholder="TH <= 100"
                onChange={(e) => updateCustomerRow(index, "thicknessRateUpto100", e.target.value)}
              />
              <input
                type="number"
                value={item.thicknessRateAbove100}
                placeholder="TH > 100"
                onChange={(e) => updateCustomerRow(index, "thicknessRateAbove100", e.target.value)}
              />
              <button type="button" className="admin-remove-btn" onClick={() => removeCustomerRow(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-add-btn admin-modal-secondary" onClick={addCustomerRow}>
            Add Customer
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAndClose}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={activeSection === "thickness"}
        onClose={() => setActiveSection(null)}
        title="Thickness Pricing"
        className="admin-section-modal"
        size="small"
      >
        <p className="admin-help">
          This controls the default thickness pricing split used by Programmer.
        </p>
        <div className="admin-hours-grid">
          <label>
            Thickness Pricing {"<= 100"}
            <input
              type="number"
              value={config?.thicknessRateUpto100 ?? 1500}
              onChange={(e) =>
                setConfig((prev) => (prev ? { ...prev, thicknessRateUpto100: Number(e.target.value) || 0 } : prev))
              }
            />
          </label>
          <label>
            Thickness Pricing {"> 100"}
            <input
              type="number"
              value={config?.thicknessRateAbove100 ?? 1200}
              onChange={(e) =>
                setConfig((prev) => (prev ? { ...prev, thicknessRateAbove100: Number(e.target.value) || 0 } : prev))
              }
            />
          </label>
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
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
        <div className="admin-modal-actions admin-modal-actions-end">
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
        <div className="admin-modal-actions admin-modal-actions-end">
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
                <button type="button" className="admin-remove-btn" onClick={() => removeOption(index, setElectrodeOptions)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
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
        <div className="admin-modal-actions admin-modal-actions-end">
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
            Default Setting Hrs
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
        <div className="admin-modal-actions admin-modal-actions-end">
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
