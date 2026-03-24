import type { Dispatch, SetStateAction } from "react";
import Modal from "../../../components/Modal";
import type { CustomerRate, MasterConfig } from "../../../types/masterConfig";
import { formatMachineLabel, toMachineIndex } from "../../../utils/jobFormatting";
import type { AdminSection, AdminToastState } from "../adminConsoleUtils";

type Props = {
  activeSection: AdminSection;
  setActiveSection: Dispatch<SetStateAction<AdminSection>>;
  customers: CustomerRate[];
  updateCustomerRow: (index: number, field: keyof CustomerRate, value: string) => void;
  addCustomerRow: () => void;
  removeCustomerRow: (index: number) => void;
  config: MasterConfig | null;
  setConfig: Dispatch<SetStateAction<MasterConfig | null>>;
  materialInput: string;
  setMaterialInput: Dispatch<SetStateAction<string>>;
  materials: string[];
  setMaterials: Dispatch<SetStateAction<string[]>>;
  passInput: string;
  setPassInput: Dispatch<SetStateAction<string>>;
  passOptions: string[];
  setPassOptions: Dispatch<SetStateAction<string[]>>;
  electrodeInput: string;
  setElectrodeInput: Dispatch<SetStateAction<string>>;
  electrodeOptions: string[];
  setElectrodeOptions: Dispatch<SetStateAction<string[]>>;
  machineInput: string;
  setMachineInput: Dispatch<SetStateAction<string>>;
  machineOptions: string[];
  setMachineOptions: Dispatch<SetStateAction<string[]>>;
  addOption: (
    rawValue: string,
    setValue: Dispatch<SetStateAction<string>>,
    setList: Dispatch<SetStateAction<string[]>>,
    emptyMessage: string
  ) => void;
  removeOption: (index: number, setList: Dispatch<SetStateAction<string[]>>) => void;
  sanitizeMachineOptions: (values: string[]) => string[];
  setToast: Dispatch<SetStateAction<AdminToastState>>;
  saving: boolean;
  handleSaveAndClose: () => Promise<void>;
};

const SaveButton = ({ saving, onSave }: { saving: boolean; onSave: () => Promise<void> }) => (
  <button type="button" className="btn-primary" disabled={saving} onClick={() => void onSave()}>
    {saving ? "Saving..." : "Save"}
  </button>
);

const OptionList = ({ items, emptyText, removeItem }: { items: string[]; emptyText: string; removeItem: (index: number) => void }) => (
  <div className="admin-option-list">
    {items.length === 0 ? (
      <p className="admin-empty-text">{emptyText}</p>
    ) : (
      items.map((item, index) => (
        <div className="admin-option-row" key={`${item}-${index}`}>
          <span>{item}</span>
          <button type="button" className="admin-remove-btn" onClick={() => removeItem(index)}>
            Remove
          </button>
        </div>
      ))
    )}
  </div>
);

const AdminSectionModals = (props: Props) => {
  const {
    activeSection,
    setActiveSection,
    customers,
    updateCustomerRow,
    addCustomerRow,
    removeCustomerRow,
    config,
    setConfig,
    materialInput,
    setMaterialInput,
    materials,
    setMaterials,
    passInput,
    setPassInput,
    passOptions,
    setPassOptions,
    electrodeInput,
    setElectrodeInput,
    electrodeOptions,
    setElectrodeOptions,
    machineInput,
    setMachineInput,
    machineOptions,
    setMachineOptions,
    addOption,
    removeOption,
    sanitizeMachineOptions,
    setToast,
    saving,
    handleSaveAndClose,
  } = props;

  return (
    <>
      <Modal isOpen={activeSection === "customers"} onClose={() => setActiveSection(null)} title="Customers & Rates" className="admin-section-modal admin-customer-modal" size="large">
        <p className="admin-help">
          Programmer reads these values per customer. Default Setting Hrs stays global, and you can override Setting
          Hrs plus thickness pricing here for a specific customer when needed.
        </p>
        <div className="admin-customer-list">
          {customers.map((item, index) => (
            <div className="admin-customer-row admin-customer-row-simple" key={`customer-${index}`}>
              <input type="text" value={item.customer} placeholder="Customer" onChange={(e) => updateCustomerRow(index, "customer", e.target.value)} />
              <input type="number" value={item.rate} placeholder="Rate" onChange={(e) => updateCustomerRow(index, "rate", e.target.value)} />
              <input type="number" step="0.01" value={item.settingHours} placeholder="Setting Hrs" onChange={(e) => updateCustomerRow(index, "settingHours", e.target.value)} />
              <input type="number" value={item.thicknessRateUpto100} placeholder="TH <= 100" onChange={(e) => updateCustomerRow(index, "thicknessRateUpto100", e.target.value)} />
              <input type="number" value={item.thicknessRateAbove100} placeholder="TH > 100" onChange={(e) => updateCustomerRow(index, "thicknessRateAbove100", e.target.value)} />
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
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "thickness"} onClose={() => setActiveSection(null)} title="Thickness Pricing" className="admin-section-modal" size="small">
        <p className="admin-help">This controls the default thickness pricing split used by Programmer.</p>
        <div className="admin-hours-grid">
          <label>
            Thickness Pricing {"<= 100"}
            <input type="number" value={config?.thicknessRateUpto100 ?? 1500} onChange={(e) => setConfig((prev) => (prev ? { ...prev, thicknessRateUpto100: Number(e.target.value) || 0 } : prev))} />
          </label>
          <label>
            Thickness Pricing {"> 100"}
            <input type="number" value={config?.thicknessRateAbove100 ?? 1200} onChange={(e) => setConfig((prev) => (prev ? { ...prev, thicknessRateAbove100: Number(e.target.value) || 0 } : prev))} />
          </label>
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "materials"} onClose={() => setActiveSection(null)} title="Material Options" className="admin-section-modal" size="small">
        <label>Add Material</label>
        <div className="admin-option-input-row">
          <input type="text" value={materialInput} placeholder="e.g. SS (Stainless Steel)" onChange={(e) => setMaterialInput(e.target.value)} />
          <button type="button" className="admin-add-btn" onClick={() => addOption(materialInput, setMaterialInput, setMaterials, "Enter a material value first")}>
            Save
          </button>
        </div>
        <OptionList items={materials} emptyText="No material options added yet." removeItem={(index) => removeOption(index, setMaterials)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "pass"} onClose={() => setActiveSection(null)} title="Pass Options" className="admin-section-modal" size="small">
        <label>Add Pass</label>
        <div className="admin-option-input-row">
          <input type="text" value={passInput} placeholder="e.g. 1" onChange={(e) => setPassInput(e.target.value)} />
          <button type="button" className="admin-add-btn" onClick={() => addOption(passInput, setPassInput, setPassOptions, "Enter a pass value first")}>
            Save
          </button>
        </div>
        <OptionList items={passOptions} emptyText="No pass options added yet." removeItem={(index) => removeOption(index, setPassOptions)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "sedm"} onClose={() => setActiveSection(null)} title="SEDM Electrode Options" className="admin-section-modal" size="small">
        <label>Add SEDM Electrode</label>
        <div className="admin-option-input-row">
          <input type="text" value={electrodeInput} placeholder="e.g. 0.3" onChange={(e) => setElectrodeInput(e.target.value)} />
          <button type="button" className="admin-add-btn" onClick={() => addOption(electrodeInput, setElectrodeInput, setElectrodeOptions, "Enter an electrode value first")}>
            Save
          </button>
        </div>
        <OptionList items={electrodeOptions} emptyText="No electrode options added yet." removeItem={(index) => removeOption(index, setElectrodeOptions)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "machines"} onClose={() => setActiveSection(null)} title="Machine Options" className="admin-section-modal" size="small">
        <label>Add Machine</label>
        <div className="admin-option-input-row">
          <input type="text" value={machineInput} placeholder="e.g. M1 or 1" onChange={(e) => setMachineInput(e.target.value.toUpperCase())} />
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
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "hours"} onClose={() => setActiveSection(null)} title="Hours Configuration" className="admin-section-modal" size="small">
        <div className="admin-hours-grid">
          <label>
            Default Setting Hrs
            <select value={Number(config?.settingHoursPerSetting) === 0.25 ? "0.25" : "0.5"} onChange={(e) => setConfig((prev) => (prev ? { ...prev, settingHoursPerSetting: e.target.value === "0.25" ? 0.25 : 0.5 } : prev))}>
              <option value="0.5">0.5</option>
              <option value="0.25">0.25</option>
            </select>
          </label>
          <label>
            Complex Extra Hrs
            <input type="number" step="0.1" value={config?.complexExtraHours ?? 1} onChange={(e) => setConfig((prev) => (prev ? { ...prev, complexExtraHours: Number(e.target.value) || 0 } : prev))} />
          </label>
          <label>
            PIP Extra Hrs
            <input type="number" step="0.1" value={config?.pipExtraHours ?? 1} onChange={(e) => setConfig((prev) => (prev ? { ...prev, pipExtraHours: Number(e.target.value) || 0 } : prev))} />
          </label>
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} onSave={handleSaveAndClose} />
        </div>
      </Modal>
    </>
  );
};

export default AdminSectionModals;
