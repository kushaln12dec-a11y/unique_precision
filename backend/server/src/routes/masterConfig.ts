import { Router } from "express";
import MasterConfig from "../models/MasterConfig";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

const DEFAULT_MASTER_CONFIG = {
  key: "global",
  customers: [
    { customer: "UPC001", rate: "100" },
    { customer: "UPC002", rate: "10" },
    { customer: "UPC003", rate: "" },
    { customer: "UPC004", rate: "" },
    { customer: "UPC005", rate: "" },
  ],
  materials: ["SS (Stainless Steel)", "Copper", "Brass", "Carbide"],
  passOptions: ["1", "2", "3", "4", "5", "6"],
  sedmElectrodeOptions: ["0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "1.0", "1.5", "2.0", "2.5", "3.0"],
  machineOptions: ["1", "2", "3", "4", "5", "6"],
  sedmThOptions: [
    { value: "min", label: "Min" },
    { value: "per", label: "Greater than 20mm" },
  ],
  settingHoursPerSetting: 0.5,
  complexExtraHours: 1,
  pipExtraHours: 1,
};

const normalizeList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  const cleaned = values
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
};

const normalizeCustomers = (values: unknown): Array<{ customer: string; rate: string }> => {
  if (!Array.isArray(values)) return [];
  const unique = new Map<string, string>();
  values.forEach((item) => {
    const customer = String((item as any)?.customer || "").trim();
    const rate = String((item as any)?.rate || "").trim();
    if (!customer) return;
    unique.set(customer, rate);
  });
  return Array.from(unique.entries()).map(([customer, rate]) => ({ customer, rate }));
};

const normalizeThOptions = (values: unknown): Array<{ value: string; label: string }> => {
  if (!Array.isArray(values)) return [];
  const unique = new Map<string, string>();
  values.forEach((item) => {
    const value = String((item as any)?.value || "").trim();
    const label = String((item as any)?.label || "").trim();
    if (!value || !label) return;
    unique.set(value, label);
  });
  return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
};

const getMasterConfig = async () => {
  let config = await MasterConfig.findOne({ key: "global" });
  if (!config) {
    config = await MasterConfig.create(DEFAULT_MASTER_CONFIG);
  }
  return config;
};

router.use(authMiddleware);

router.get("/", async (_req, res) => {
  try {
    const config = await getMasterConfig();
    return res.json(config);
  } catch (error: any) {
    console.error("Failed to fetch master config:", error);
    return res.status(500).json({ message: "Failed to fetch master config" });
  }
});

router.put("/", adminMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    const nextData = {
      customers: normalizeCustomers(payload.customers),
      materials: normalizeList(payload.materials),
      passOptions: normalizeList(payload.passOptions),
      sedmElectrodeOptions: normalizeList(payload.sedmElectrodeOptions),
      machineOptions: normalizeList(payload.machineOptions),
      sedmThOptions: normalizeThOptions(payload.sedmThOptions),
      settingHoursPerSetting: Number(payload.settingHoursPerSetting) || 0.5,
      complexExtraHours: Number(payload.complexExtraHours) || 1,
      pipExtraHours: Number(payload.pipExtraHours) || 1,
    };

    const config = await MasterConfig.findOneAndUpdate(
      { key: "global" },
      { $set: nextData, $setOnInsert: { key: "global" } },
      { new: true, upsert: true }
    );

    return res.json(config);
  } catch (error: any) {
    console.error("Failed to update master config:", error);
    return res.status(500).json({ message: "Failed to update master config" });
  }
});

export default router;
