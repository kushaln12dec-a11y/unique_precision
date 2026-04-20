export type SedmCustomerPricingFields = {
  sedm034Min: string;
  sedm034PerMm: string;
  sedm056Min: string;
  sedm056PerMm: string;
  sedm07Min: string;
  sedm07PerMm: string;
  sedm0812Min: string;
  sedm0812PerMm: string;
  sedm1520Min: string;
  sedm1520PerMm: string;
  sedm2225Min: string;
  sedm2225PerMm: string;
  sedm30Min: string;
  sedm30PerMm: string;
};

export type CustomerRate = {
  customer: string;
  rate: string;
  settingHours: string;
  thicknessRateUpto100: string;
  thicknessRateAbove100: string;
} & SedmCustomerPricingFields;

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
