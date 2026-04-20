import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import { getUserRoleFromToken } from "../../utils/auth";
import { getMasterConfig, updateMasterConfig } from "../../services/masterConfigApi";
import type { CustomerRate, MasterConfig } from "../../types/masterConfig";
import { MACHINE_OPTIONS, toMachineIndex } from "../../utils/jobFormatting";
import AdminSectionModals from "./components/AdminSectionModals";
import AdminSummaryCards from "./components/AdminSummaryCards";
import {
  type AdminSection,
  type AdminSnapshot,
  type AdminToastState,
  DEFAULT_CUSTOMERS,
  DEFAULT_SEDM_CUSTOMER_PRICING,
  normalizeCustomerRows,
  normalizeOptionValue,
  sanitizeOptions,
  serialize,
} from "./adminConsoleUtils";
import "../RoleBoard.css";
import "./AdminConsole.css";

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

const AdminConsole = () => {
  const navigate = useNavigate();
  const role = useMemo(() => (getUserRoleFromToken() || "").toUpperCase(), []);
  const canManageConfig = role === "ADMIN";
  const canViewConfig = canManageConfig || role === "ACCOUNTANT";
  const [config, setConfig] = useState<MasterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>(null);
  const [toast, setToast] = useState<AdminToastState>({ message: "", variant: "success", visible: false });
  const [materials, setMaterials] = useState<string[]>([]);
  const [passOptions, setPassOptions] = useState<string[]>([]);
  const [electrodeOptions, setElectrodeOptions] = useState<string[]>([]);
  const [machineOptions, setMachineOptions] = useState<string[]>([]);
  const [customers, setCustomers] = useState<CustomerRate[]>([]);
  const [materialInput, setMaterialInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [electrodeInput, setElectrodeInput] = useState("");
  const [machineInput, setMachineInput] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<AdminSnapshot>({
    customers: [],
    materials: [],
    passOptions: [],
    electrodeOptions: [],
    machineOptions: [],
    hoursConfig: null,
    thicknessConfig: null,
  });

  useEffect(() => {
    if (!canViewConfig) {
      navigate("/dashboard");
      return;
    }

    const load = async () => {
      try {
        const fetched = await getMasterConfig();
        const nextCustomers = normalizeCustomerRows(fetched.customers.length > 0 ? fetched.customers : DEFAULT_CUSTOMERS);
        const nextMaterials = sanitizeOptions(fetched.materials);
        const nextPassOptions = sanitizeOptions(fetched.passOptions);
        const nextElectrodeOptions = sanitizeOptions(fetched.sedmElectrodeOptions);
        const nextMachineOptions = sanitizeMachineOptions(
          Array.isArray(fetched.machineOptions) && fetched.machineOptions.length > 0 ? fetched.machineOptions : [...MACHINE_OPTIONS]
        );

        setConfig(fetched);
        setCustomers(nextCustomers);
        setMaterials(nextMaterials);
        setPassOptions(nextPassOptions);
        setElectrodeOptions(nextElectrodeOptions);
        setMachineOptions(nextMachineOptions);
        persistSnapshot(fetched, setSavedSnapshot);
      } catch {
        setToast({ message: "Failed to load Admin Console data", variant: "error", visible: true });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [canViewConfig, navigate]);

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

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const updated = await updateMasterConfig({
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
      });

      setConfig(updated);
      setCustomers(normalizeCustomerRows(updated.customers));
      setMaterials(sanitizeOptions(updated.materials));
      setPassOptions(sanitizeOptions(updated.passOptions));
      setElectrodeOptions(sanitizeOptions(updated.sedmElectrodeOptions));
      setMachineOptions(sanitizeMachineOptions(updated.machineOptions));
      persistSnapshot(updated, setSavedSnapshot);
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

  const summaryCards = [
    { title: "Customers & Rates", value: `${normalizedCustomers.length} customer profiles`, detail: "Customer rate, setting hrs, and all SEDM slab values are managed together per customer.", dirty: sectionDirty.customers, onClick: () => setActiveSection("customers") },
    { title: "Thickness Pricing", value: `${normalizedThicknessConfig.thicknessRateUpto100} / ${normalizedThicknessConfig.thicknessRateAbove100}`, detail: "Global pricing divisor for thickness <= 100 and > 100.", dirty: sectionDirty.thickness, onClick: () => setActiveSection("thickness") },
    { title: "Material Options", value: `${normalizedMaterials.length} material presets`, detail: "Used in Programmer forms and standardizes entries.", dirty: sectionDirty.materials, onClick: () => setActiveSection("materials") },
    { title: "Pass Options", value: `${normalizedPassOptions.length} pass presets`, detail: "Controls pass dropdown values in the job form.", dirty: sectionDirty.pass, onClick: () => setActiveSection("pass") },
    { title: "SEDM Electrode", value: `${normalizedElectrodeOptions.length} electrode options`, detail: "Keeps SEDM selection fast and consistent.", dirty: sectionDirty.sedm, onClick: () => setActiveSection("sedm") },
    { title: "Machine Options", value: `${normalizedMachineOptions.length} machine slots`, detail: "Feeds the Operator Mach # dropdowns.", dirty: sectionDirty.machines, onClick: () => setActiveSection("machines") },
    { title: "Hours Config", value: `${normalizedHoursConfig.settingHoursPerSetting} base setting hrs`, detail: "Global extras still apply across Programmer calculations.", dirty: sectionDirty.hours, onClick: () => setActiveSection("hours") },
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
              <AdminSummaryCards cards={summaryCards} />
              <div className="admin-console-actions">
                {canManageConfig ? (
                  <button type="button" className="admin-save-button admin-save-button-hero" disabled={saving || loading || activeSection !== null} onClick={() => void handleSave()}>
                    <span className="admin-save-button-shine" aria-hidden="true" />
                    <span className="admin-save-button-label">{saving ? "Saving..." : "Save All Changes"}</span>
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <AdminSectionModals
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        readOnly={!canManageConfig}
        customers={customers}
        updateCustomerRow={(index, field, value) =>
          setCustomers((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: field === "customer" ? value.toUpperCase() : value } : row)))
        }
        addCustomerRow={() =>
          setCustomers((prev) => [...prev, { customer: "", rate: "", settingHours: "", thicknessRateUpto100: "", thicknessRateAbove100: "", ...DEFAULT_SEDM_CUSTOMER_PRICING }])
        }
        removeCustomerRow={(index) => setCustomers((prev) => prev.filter((_, idx) => idx !== index))}
        config={config}
        setConfig={setConfig}
        materialInput={materialInput}
        setMaterialInput={setMaterialInput}
        materials={materials}
        setMaterials={setMaterials}
        passInput={passInput}
        setPassInput={setPassInput}
        passOptions={passOptions}
        setPassOptions={setPassOptions}
        electrodeInput={electrodeInput}
        setElectrodeInput={setElectrodeInput}
        electrodeOptions={electrodeOptions}
        setElectrodeOptions={setElectrodeOptions}
        machineInput={machineInput}
        setMachineInput={setMachineInput}
        machineOptions={machineOptions}
        setMachineOptions={setMachineOptions}
        addOption={addOption}
        removeOption={(index, setList) => setList((prev) => prev.filter((_, idx) => idx !== index))}
        sanitizeMachineOptions={sanitizeMachineOptions}
        setToast={setToast}
        saving={saving}
        handleSaveAndClose={handleSaveAndClose}
      />

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </div>
  );
};

const persistSnapshot = (nextConfig: MasterConfig, setSavedSnapshot: Dispatch<SetStateAction<AdminSnapshot>>) => {
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

export default AdminConsole;
