export type CustomerRate = {
  customer: string;
  rate: string;
  settingHours: string;
  thicknessRateUpto100: string;
  thicknessRateAbove100: string;
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
  thicknessRateUpto100: number;
  thicknessRateAbove100: number;
  complexExtraHours: number;
  pipExtraHours: number;
};
