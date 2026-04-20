import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Modal from "../../../components/Modal";
import type { CustomerRate, MasterConfig } from "../../../types/masterConfig";
import { formatMachineLabel, toMachineIndex } from "../../../utils/jobFormatting";
import type { AdminSection, AdminToastState } from "../adminConsoleUtils";

const SEDM_SLAB_GROUPS: Array<{
  key: string;
  title: string;
  minField: keyof CustomerRate;
  perField: keyof CustomerRate;
}> = [
  { key: "034", title: "0.3 - 0.4", minField: "sedm034Min", perField: "sedm034PerMm" },
  { key: "056", title: "0.5 - 0.6", minField: "sedm056Min", perField: "sedm056PerMm" },
  { key: "07", title: "0.7", minField: "sedm07Min", perField: "sedm07PerMm" },
  { key: "0812", title: "0.8 - 1.2", minField: "sedm0812Min", perField: "sedm0812PerMm" },
  { key: "1520", title: "1.5 - 2.0", minField: "sedm1520Min", perField: "sedm1520PerMm" },
  { key: "2225", title: "2.2 - 2.5", minField: "sedm2225Min", perField: "sedm2225PerMm" },
  { key: "30", title: "3.0", minField: "sedm30Min", perField: "sedm30PerMm" },
];
type Props = {
  activeSection: AdminSection;
  setActiveSection: Dispatch<SetStateAction<AdminSection>>;
  readOnly: boolean;
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

const SaveButton = ({
  saving,
  readOnly,
  onSave,
  label = "Save Changes",
  className = "",
}: {
  saving: boolean;
  readOnly: boolean;
  onSave: () => Promise<void>;
  label?: string;
  className?: string;
}) => (
  <button
    type="button"
    className={`admin-save-button ${className}`.trim()}
    disabled={saving || readOnly}
    onClick={() => void onSave()}
  >
    <span className="admin-save-button-shine" aria-hidden="true" />
    <span className="admin-save-button-label">
      {readOnly ? "Read Only" : saving ? "Saving..." : label}
    </span>
  </button>
);

const OptionList = ({ items, emptyText, readOnly, removeItem }: { items: string[]; emptyText: string; readOnly: boolean; removeItem: (index: number) => void }) => (
  <div className="admin-option-list">
    {items.length === 0 ? (
      <p className="admin-empty-text">{emptyText}</p>
    ) : (
      items.map((item, index) => (
        <div className="admin-option-row" key={`${item}-${index}`}>
          <span>{item}</span>
          <button type="button" className="admin-remove-btn" disabled={readOnly} onClick={() => removeItem(index)}>
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
    readOnly,
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
  const [selectedSedmCustomerIndex, setSelectedSedmCustomerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeSection !== "customers") {
      setSelectedSedmCustomerIndex(null);
      return;
    }

    if (customers.length === 0) {
      setSelectedSedmCustomerIndex(null);
      return;
    }

    setSelectedSedmCustomerIndex((prev) => {
      if (prev === null) return 0;
      return prev >= customers.length ? customers.length - 1 : prev;
    });
  }, [activeSection, customers.length]);

  const selectedSedmCustomer =
    selectedSedmCustomerIndex !== null && customers[selectedSedmCustomerIndex]
      ? customers[selectedSedmCustomerIndex]
      : null;

  const selectedSedmSummary = useMemo(
    () =>
      selectedSedmCustomer
        ? SEDM_SLAB_GROUPS.map((group) => ({
            ...group,
            minValue: selectedSedmCustomer[group.minField],
            perValue: selectedSedmCustomer[group.perField],
          }))
        : [],
    [selectedSedmCustomer]
  );

  return (
    <>
      <Modal isOpen={activeSection === "customers"} onClose={() => setActiveSection(null)} title="Customers & Rates" className="admin-section-modal admin-customer-modal" size="large">
        <p className="admin-help">
          Programmer reads these values per customer. Default Setting Hrs stays global, and you can override the
          customer rate, setting hours, and SEDM slab pricing here whenever a customer needs a custom rule.
        </p>
        <div className="admin-customer-workspace">
          <div className="admin-customer-list">
            {customers.map((item, index) => (
              <div className={`admin-customer-card ${selectedSedmCustomerIndex === index ? "active" : ""}`} key={`customer-${index}`}>
                <div className="admin-customer-card-top">
                  <div className="admin-customer-card-title">
                    <span className="admin-customer-card-index">Customer {index + 1}</span>
                    <strong>{item.customer || "New Customer"}</strong>
                  </div>
                  <button type="button" className="admin-remove-btn" disabled={readOnly} onClick={() => removeCustomerRow(index)}>
                    Remove
                  </button>
                </div>
                <div className="admin-customer-card-grid">
                  <label className="admin-customer-field">
                    <span>Customer Code</span>
                    <input type="text" value={item.customer} placeholder="UPC001" disabled={readOnly} onChange={(e) => updateCustomerRow(index, "customer", e.target.value)} />
                  </label>
                  <label className="admin-customer-field">
                    <span>Rate</span>
                    <input type="number" value={item.rate} placeholder="Rate" disabled={readOnly} onChange={(e) => updateCustomerRow(index, "rate", e.target.value)} />
                  </label>
                  <label className="admin-customer-field">
                    <span>Setting Hrs</span>
                    <input type="number" step="0.01" value={item.settingHours} placeholder="0.5" disabled={readOnly} onChange={(e) => updateCustomerRow(index, "settingHours", e.target.value)} />
                  </label>
                </div>
                <div className="admin-customer-sedm-preview">
                  {SEDM_SLAB_GROUPS.slice(0, 3).map((group) => (
                    <div className="admin-customer-sedm-chip" key={`${group.key}-${index}`}>
                      <strong>{group.title}</strong>
                      <span>Min {String(item[group.minField] || "").trim() || "-"}</span>
                      <span>&gt;20 {String(item[group.perField] || "").trim() || "-"}</span>
                    </div>
                  ))}
                </div>
                <div className="admin-customer-card-actions">
                  <button type="button" className="admin-add-btn admin-sedm-open-btn" disabled={readOnly} onClick={() => setSelectedSedmCustomerIndex(index)}>
                    Configure SEDM Values
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="admin-customer-sedm-panel">
            <div className="admin-customer-sedm-panel-header">
              <div>
                <span className="admin-customer-card-index">SEDM Configurator</span>
                <strong>{selectedSedmCustomer?.customer || "Select a customer"}</strong>
              </div>
              <span className="admin-customer-sedm-panel-note">
                Click a customer card and edit all SEDM slab values from this side panel inside the modal.
              </span>
            </div>
            {selectedSedmCustomer && selectedSedmCustomerIndex !== null ? (
              <div className="admin-customer-sedm-grid">
                {selectedSedmSummary.map((group) => (
                  <div className="admin-customer-sedm-field" key={`${group.key}-${selectedSedmCustomerIndex}`}>
                    <span>{group.title}</span>
                    <label>
                      Min
                      <input
                        type="number"
                        value={selectedSedmCustomer[group.minField]}
                        placeholder={String(group.minValue || "").trim() || "-"}
                        disabled={readOnly}
                        onChange={(e) => updateCustomerRow(selectedSedmCustomerIndex, group.minField, e.target.value)}
                      />
                    </label>
                    <label>
                      &gt;20/mm
                      <input
                        type="number"
                        value={selectedSedmCustomer[group.perField]}
                        placeholder={String(group.perValue || "").trim() || "-"}
                        disabled={readOnly}
                        onChange={(e) => updateCustomerRow(selectedSedmCustomerIndex, group.perField, e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-empty-text">Add a customer or choose one to configure SEDM values.</p>
            )}
          </aside>
        </div>
        <p className="admin-help">
          Use uppercase customer codes like `UPC001`. Every SEDM slab here is editable per customer, so Admin can tune Min and Greater than 20mm rates at any time.
        </p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-add-btn admin-modal-secondary" disabled={readOnly} onClick={addCustomerRow}>
            Add Customer
          </button>
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "thickness"} onClose={() => setActiveSection(null)} title="Thickness Pricing" className="admin-section-modal" size="small">
        <p className="admin-help">This controls the default thickness pricing split used by Programmer.</p>
        <div className="admin-hours-grid">
          <label>
            Thickness Pricing {"<= 100"}
            <input type="number" disabled={readOnly} value={config?.thicknessRateUpto100 ?? 1500} onChange={(e) => setConfig((prev) => (prev ? { ...prev, thicknessRateUpto100: Number(e.target.value) || 0 } : prev))} />
          </label>
          <label>
            Thickness Pricing {"> 100"}
            <input type="number" disabled={readOnly} value={config?.thicknessRateAbove100 ?? 1200} onChange={(e) => setConfig((prev) => (prev ? { ...prev, thicknessRateAbove100: Number(e.target.value) || 0 } : prev))} />
          </label>
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "materials"} onClose={() => setActiveSection(null)} title="Material Options" className="admin-section-modal" size="small">
        <label>Add Material</label>
        <div className="admin-option-input-row">
          <input type="text" value={materialInput} disabled={readOnly} placeholder="e.g. SS (Stainless Steel)" onChange={(e) => setMaterialInput(e.target.value)} />
          <button type="button" className="admin-add-btn" disabled={readOnly} onClick={() => addOption(materialInput, setMaterialInput, setMaterials, "Enter a material value first")}>
            Save
          </button>
        </div>
        <OptionList items={materials} emptyText="No material options added yet." readOnly={readOnly} removeItem={(index) => removeOption(index, setMaterials)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} label="Save Materials" />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "pass"} onClose={() => setActiveSection(null)} title="Pass Options" className="admin-section-modal" size="small">
        <label>Add Pass</label>
        <div className="admin-option-input-row">
          <input type="text" value={passInput} disabled={readOnly} placeholder="e.g. 1" onChange={(e) => setPassInput(e.target.value)} />
          <button type="button" className="admin-add-btn" disabled={readOnly} onClick={() => addOption(passInput, setPassInput, setPassOptions, "Enter a pass value first")}>
            Save
          </button>
        </div>
        <OptionList items={passOptions} emptyText="No pass options added yet." readOnly={readOnly} removeItem={(index) => removeOption(index, setPassOptions)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} label="Save Pass Options" />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "sedm"} onClose={() => setActiveSection(null)} title="SEDM Electrode Options" className="admin-section-modal" size="small">
        <label>Add SEDM Electrode</label>
        <div className="admin-option-input-row">
          <input type="text" value={electrodeInput} disabled={readOnly} placeholder="e.g. 0.3" onChange={(e) => setElectrodeInput(e.target.value)} />
          <button type="button" className="admin-add-btn" disabled={readOnly} onClick={() => addOption(electrodeInput, setElectrodeInput, setElectrodeOptions, "Enter an electrode value first")}>
            Save
          </button>
        </div>
        <OptionList items={electrodeOptions} emptyText="No electrode options added yet." readOnly={readOnly} removeItem={(index) => removeOption(index, setElectrodeOptions)} />
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} label="Save Electrode Options" />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "machines"} onClose={() => setActiveSection(null)} title="Machine Options" className="admin-section-modal" size="small">
        <label>Add Machine</label>
        <p className="admin-help admin-help-compact">
          Enter a machine as `M7` or `7`. The app will save and display it in `M&lt;number&gt;` format.
        </p>
        <div className="admin-option-input-row">
          <input type="text" value={machineInput} disabled={readOnly} placeholder="e.g. M7 or 7" onChange={(e) => setMachineInput(e.target.value.toUpperCase())} />
          <button
            type="button"
            className="admin-add-btn"
            disabled={readOnly}
            onClick={() => {
              const normalized = toMachineIndex(machineInput);
              if (!normalized) {
                setToast({ message: "Enter a valid machine value like M7 or 7", variant: "info", visible: true });
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
                <button type="button" className="admin-remove-btn" disabled={readOnly} onClick={() => removeOption(index, setMachineOptions)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} label="Save Machines" />
        </div>
      </Modal>

      <Modal isOpen={activeSection === "hours"} onClose={() => setActiveSection(null)} title="Hours Configuration" className="admin-section-modal" size="small">
        <div className="admin-hours-grid">
          <label>
            Default Setting Hrs
            <select disabled={readOnly} value={Number(config?.settingHoursPerSetting) === 0.25 ? "0.25" : "0.5"} onChange={(e) => setConfig((prev) => (prev ? { ...prev, settingHoursPerSetting: e.target.value === "0.25" ? 0.25 : 0.5 } : prev))}>
              <option value="0.5">0.5</option>
              <option value="0.25">0.25</option>
            </select>
          </label>
          <label>
            Complex Extra Hrs
            <input type="number" step="0.1" disabled={readOnly} value={config?.complexExtraHours ?? 1} onChange={(e) => setConfig((prev) => (prev ? { ...prev, complexExtraHours: Number(e.target.value) || 0 } : prev))} />
          </label>
          <label>
            PIP Extra Hrs
            <input type="number" step="0.1" disabled={readOnly} value={config?.pipExtraHours ?? 1} onChange={(e) => setConfig((prev) => (prev ? { ...prev, pipExtraHours: Number(e.target.value) || 0 } : prev))} />
          </label>
        </div>
        <div className="admin-modal-actions admin-modal-actions-end">
          <SaveButton saving={saving} readOnly={readOnly} onSave={handleSaveAndClose} label="Save Hours Config" />
        </div>
      </Modal>
    </>
  );
};

export default AdminSectionModals;
