import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

const DEFAULT_MASTER_CONFIG = {
  key: "global",
  customers: [
    { customer: "UPC001", rate: "100", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
    { customer: "UPC002", rate: "10", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
    { customer: "UPC003", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
    { customer: "UPC004", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
    { customer: "UPC005", rate: "", settingHours: "0.5", thicknessRateUpto100: "1500", thicknessRateAbove100: "1200" },
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
  thicknessRateUpto100: 1500,
  thicknessRateAbove100: 1200,
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

const normalizeCustomers = (
  values: unknown
): Array<{
  customer: string;
  rate: string;
  settingHours: string;
  thicknessRateUpto100: string;
  thicknessRateAbove100: string;
}> => {
  if (!Array.isArray(values)) return [];
  const unique = new Map<
    string,
    {
      customer: string;
      rate: string;
      settingHours: string;
      thicknessRateUpto100: string;
      thicknessRateAbove100: string;
    }
  >();
  values.forEach((item) => {
    const customer = String((item as any)?.customer || "").trim();
    const rate = String((item as any)?.rate || "").trim();
    const settingHours = String((item as any)?.settingHours || "").trim();
    const thicknessRateUpto100 = String((item as any)?.thicknessRateUpto100 || "").trim();
    const thicknessRateAbove100 = String((item as any)?.thicknessRateAbove100 || "").trim();
    if (!customer) return;
    unique.set(customer, {
      customer,
      rate,
      settingHours,
      thicknessRateUpto100,
      thicknessRateAbove100,
    });
  });
  return Array.from(unique.values());
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
  let config = await prisma.masterConfig.findUnique({
    where: { key: "global" },
    include: {
      customers: true,
      materials: true,
      passOptions: true,
      sedmElectrodeOptions: true,
      machineOptions: true,
      sedmThOptions: true,
    },
  });

  if (!config) {
    config = await prisma.masterConfig.create({
      data: {
        key: "global",
      settingHoursPerSetting: DEFAULT_MASTER_CONFIG.settingHoursPerSetting,
      thicknessRateUpto100: DEFAULT_MASTER_CONFIG.thicknessRateUpto100,
      thicknessRateAbove100: DEFAULT_MASTER_CONFIG.thicknessRateAbove100,
      complexExtraHours: DEFAULT_MASTER_CONFIG.complexExtraHours,
        pipExtraHours: DEFAULT_MASTER_CONFIG.pipExtraHours,
        customers: {
          create: DEFAULT_MASTER_CONFIG.customers.map((c) => ({
            customer: c.customer,
            rate: c.rate ? c.rate : null,
            settingHours: c.settingHours ? c.settingHours : null,
            thicknessRateUpto100: c.thicknessRateUpto100 ? c.thicknessRateUpto100 : null,
            thicknessRateAbove100: c.thicknessRateAbove100 ? c.thicknessRateAbove100 : null,
          })),
        },
        materials: { create: DEFAULT_MASTER_CONFIG.materials.map((value) => ({ value })) },
        passOptions: { create: DEFAULT_MASTER_CONFIG.passOptions.map((value) => ({ value })) },
        sedmElectrodeOptions: {
          create: DEFAULT_MASTER_CONFIG.sedmElectrodeOptions.map((value) => ({ value })),
        },
        machineOptions: { create: DEFAULT_MASTER_CONFIG.machineOptions.map((value) => ({ value })) },
        sedmThOptions: {
          create: DEFAULT_MASTER_CONFIG.sedmThOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        },
      },
      include: {
        customers: true,
        materials: true,
        passOptions: true,
        sedmElectrodeOptions: true,
        machineOptions: true,
        sedmThOptions: true,
      },
    });
  }

  return {
    _id: config.id,
    key: config.key,
    customers: (config.customers.length > 0 ? config.customers : DEFAULT_MASTER_CONFIG.customers as any[]).map((c) => ({
      customer: c.customer,
      rate: c.rate ? String(c.rate) : "",
      settingHours: c.settingHours ? String(c.settingHours) : "",
    })),
    materials: config.materials.length > 0 ? config.materials.map((m) => m.value) : DEFAULT_MASTER_CONFIG.materials,
    passOptions: config.passOptions.length > 0 ? config.passOptions.map((p) => p.value) : DEFAULT_MASTER_CONFIG.passOptions,
    sedmElectrodeOptions:
      config.sedmElectrodeOptions.length > 0
        ? config.sedmElectrodeOptions.map((s) => s.value)
        : DEFAULT_MASTER_CONFIG.sedmElectrodeOptions,
    machineOptions: config.machineOptions.length > 0 ? config.machineOptions.map((m) => m.value) : DEFAULT_MASTER_CONFIG.machineOptions,
    sedmThOptions: config.sedmThOptions.map((s) => ({ value: s.value, label: s.label })),
    settingHoursPerSetting: Number(config.settingHoursPerSetting ?? 0.5) || 0.5,
    thicknessRateUpto100: Number(config.thicknessRateUpto100 ?? DEFAULT_MASTER_CONFIG.thicknessRateUpto100) || DEFAULT_MASTER_CONFIG.thicknessRateUpto100,
    thicknessRateAbove100: Number(config.thicknessRateAbove100 ?? DEFAULT_MASTER_CONFIG.thicknessRateAbove100) || DEFAULT_MASTER_CONFIG.thicknessRateAbove100,
    complexExtraHours: Number(config.complexExtraHours ?? 1) || 1,
    pipExtraHours: Number(config.pipExtraHours ?? 1) || 1,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
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
      thicknessRateUpto100: Number(payload.thicknessRateUpto100) || DEFAULT_MASTER_CONFIG.thicknessRateUpto100,
      thicknessRateAbove100: Number(payload.thicknessRateAbove100) || DEFAULT_MASTER_CONFIG.thicknessRateAbove100,
      complexExtraHours: Number(payload.complexExtraHours) || 1,
      pipExtraHours: Number(payload.pipExtraHours) || 1,
    };

    const config = await prisma.$transaction(async (tx) => {
      const base = await tx.masterConfig.upsert({
        where: { key: "global" },
        update: {
          settingHoursPerSetting: nextData.settingHoursPerSetting,
          thicknessRateUpto100: nextData.thicknessRateUpto100,
          thicknessRateAbove100: nextData.thicknessRateAbove100,
          complexExtraHours: nextData.complexExtraHours,
          pipExtraHours: nextData.pipExtraHours,
        },
        create: {
          key: "global",
          settingHoursPerSetting: nextData.settingHoursPerSetting,
          thicknessRateUpto100: nextData.thicknessRateUpto100,
          thicknessRateAbove100: nextData.thicknessRateAbove100,
          complexExtraHours: nextData.complexExtraHours,
          pipExtraHours: nextData.pipExtraHours,
        },
      });

      const masterConfigId = base.id;

      await Promise.all([
        tx.masterConfigCustomer.deleteMany({ where: { masterConfigId } }),
        tx.masterConfigMaterial.deleteMany({ where: { masterConfigId } }),
        tx.masterConfigPassOption.deleteMany({ where: { masterConfigId } }),
        tx.masterConfigSedmElectrodeOption.deleteMany({ where: { masterConfigId } }),
        tx.masterConfigMachineOption.deleteMany({ where: { masterConfigId } }),
        tx.masterConfigSedmThOption.deleteMany({ where: { masterConfigId } }),
      ]);

      await Promise.all([
        tx.masterConfigCustomer.createMany({
          data: nextData.customers.map((c) => ({
            masterConfigId,
            customer: c.customer,
            rate: c.rate ? c.rate : null,
            settingHours: c.settingHours ? c.settingHours : null,
            thicknessRateUpto100: c.thicknessRateUpto100 ? c.thicknessRateUpto100 : null,
            thicknessRateAbove100: c.thicknessRateAbove100 ? c.thicknessRateAbove100 : null,
          })),
        }),
        tx.masterConfigMaterial.createMany({
          data: nextData.materials.map((value) => ({ masterConfigId, value })),
        }),
        tx.masterConfigPassOption.createMany({
          data: nextData.passOptions.map((value) => ({ masterConfigId, value })),
        }),
        tx.masterConfigSedmElectrodeOption.createMany({
          data: nextData.sedmElectrodeOptions.map((value) => ({ masterConfigId, value })),
        }),
        tx.masterConfigMachineOption.createMany({
          data: nextData.machineOptions.map((value) => ({ masterConfigId, value })),
        }),
        tx.masterConfigSedmThOption.createMany({
          data: nextData.sedmThOptions.map((option) => ({
            masterConfigId,
            value: option.value,
            label: option.label,
          })),
        }),
      ]);

      return await tx.masterConfig.findUnique({
        where: { id: masterConfigId },
        include: {
          customers: true,
          materials: true,
          passOptions: true,
          sedmElectrodeOptions: true,
          machineOptions: true,
          sedmThOptions: true,
        },
      });
    });

    if (!config) {
      return res.status(500).json({ message: "Failed to update master config" });
    }

    return res.json({
      _id: config.id,
      key: config.key,
      customers: config.customers.map((c) => ({
        customer: c.customer,
        rate: c.rate ? String(c.rate) : "",
        settingHours: c.settingHours ? String(c.settingHours) : "",
      })),
      materials: config.materials.map((m) => m.value),
      passOptions: config.passOptions.map((p) => p.value),
      sedmElectrodeOptions: config.sedmElectrodeOptions.map((s) => s.value),
      machineOptions: config.machineOptions.map((m) => m.value),
      sedmThOptions: config.sedmThOptions.map((s) => ({ value: s.value, label: s.label })),
      settingHoursPerSetting: Number(config.settingHoursPerSetting ?? 0.5) || 0.5,
      thicknessRateUpto100: Number(config.thicknessRateUpto100 ?? DEFAULT_MASTER_CONFIG.thicknessRateUpto100) || DEFAULT_MASTER_CONFIG.thicknessRateUpto100,
      thicknessRateAbove100: Number(config.thicknessRateAbove100 ?? DEFAULT_MASTER_CONFIG.thicknessRateAbove100) || DEFAULT_MASTER_CONFIG.thicknessRateAbove100,
      complexExtraHours: Number(config.complexExtraHours ?? 1) || 1,
      pipExtraHours: Number(config.pipExtraHours ?? 1) || 1,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error: any) {
    console.error("Failed to update master config:", error);
    return res.status(500).json({ message: "Failed to update master config" });
  }
});

export default router;
