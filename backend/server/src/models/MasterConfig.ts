import mongoose from "mongoose";

const customerRateSchema = new mongoose.Schema(
  {
    customer: { type: String, required: true, trim: true },
    rate: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const thOptionSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const masterConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    customers: { type: [customerRateSchema], default: [] },
    materials: { type: [String], default: [] },
    passOptions: { type: [String], default: [] },
    sedmElectrodeOptions: { type: [String], default: [] },
    sedmThOptions: { type: [thOptionSchema], default: [] },
    settingHoursPerSetting: { type: Number, default: 0.5 },
    complexExtraHours: { type: Number, default: 1 },
    pipExtraHours: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("MasterConfig", masterConfigSchema);

