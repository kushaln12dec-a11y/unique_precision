export type CustomerRate = {
  customer: string;
  rate: string;
};

export type SedmThOption = {
  value: string;
  label: string;
};

export type MasterConfig = {
  customers: CustomerRate[];
  materials: string[];
  passOptions: string[];
  sedmElectrodeOptions: string[];
  machineOptions: string[];
  sedmThOptions: SedmThOption[];
  settingHoursPerSetting: number;
  complexExtraHours: number;
  pipExtraHours: number;
};
