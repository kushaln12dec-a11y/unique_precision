import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { MongoClient, type Db } from "mongodb";
import { prisma } from "../lib/prisma";
import { parseDisplayDateTime } from "../utils/dateTime";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const RESET_TARGET = String(process.env.RESET_TARGET || "").toLowerCase() === "true";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for PostgreSQL target.");
}
if (!MONGO_URI) {
  throw new Error("MONGO_URI is required for MongoDB source.");
}

const toUuid = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toInt = (value: unknown): number | null => {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = parseDisplayDateTime(value);
    if (parsed) return parsed;
  }
  const native = new Date(String(value || ""));
  return Number.isNaN(native.getTime()) ? new Date() : native;
};

const normalizeCutImage = (value: unknown): string | null => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : null;
  if (value === null || value === undefined) return null;
  return String(value);
};

const getDb = async (): Promise<Db> => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  return client.db();
};

const ensureEmptyTarget = async () => {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.employeeLog.count(),
    prisma.masterConfig.count(),
    prisma.idleTimeConfig.count(),
    prisma.counter.count(),
  ]);
  const hasData = counts.some((count) => count > 0);
  if (hasData && !RESET_TARGET) {
    throw new Error("Target PostgreSQL is not empty. Set RESET_TARGET=true to wipe and re-import.");
  }
  if (hasData && RESET_TARGET) {
    await prisma.$transaction([
      prisma.jobOperatorCapture.deleteMany(),
      prisma.jobQuantityQaState.deleteMany(),
      prisma.employeeLog.deleteMany(),
      prisma.job.deleteMany(),
      prisma.masterConfigCustomer.deleteMany(),
      prisma.masterConfigMaterial.deleteMany(),
      prisma.masterConfigPassOption.deleteMany(),
      prisma.masterConfigSedmElectrodeOption.deleteMany(),
      prisma.masterConfigMachineOption.deleteMany(),
      prisma.masterConfigSedmThOption.deleteMany(),
      prisma.masterConfig.deleteMany(),
      prisma.idleTimeConfig.deleteMany(),
      prisma.counter.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  }
};

const run = async () => {
  await ensureEmptyTarget();

  const db = await getDb();
  const users = await db.collection("users").find().toArray();
  const jobs = await db.collection("jobs").find().toArray();
  const employeeLogs = await db.collection("employeelogs").find().toArray();
  const masterConfigs = await db.collection("masterconfigs").find().toArray();
  const idleTimeConfigs = await db.collection("idletimeconfigs").find().toArray();
  const counters = await db.collection("counters").find().toArray();

  const userIdMap = new Map<string, string>();
  const jobIdMap = new Map<string, string>();

  for (const user of users) {
    const email = String(user.email || "").trim();
    if (!email) continue;

    const payload = {
      email,
      passwordHash: String(user.password || ""),
      firstName: user.firstName ? String(user.firstName) : null,
      lastName: user.lastName ? String(user.lastName) : null,
      phone: user.phone ? String(user.phone) : null,
      empId: user.empId ? String(user.empId) : null,
      image: user.image ? String(user.image) : null,
      role: user.role ? String(user.role) : "OPERATOR",
      createdAt: toDate(user.createdAt),
      updatedAt: toDate(user.updatedAt),
    };

    const created = await prisma.user.upsert({
      where: { email },
      update: payload,
      create: payload,
    });

    userIdMap.set(String(user._id), created.id);
  }

  for (const job of jobs) {
    const jobId = randomUUID();
    jobIdMap.set(String(job._id), jobId);

    const qaStates: Array<{ quantityNumber: number; status: string }> = [];
    if (job.quantityQaStates && typeof job.quantityQaStates === "object") {
      Object.entries(job.quantityQaStates).forEach(([key, value]) => {
        const qty = Number(key);
        if (!Number.isNaN(qty)) {
          qaStates.push({ quantityNumber: qty, status: String(value) });
        }
      });
    }

    const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];

    await prisma.job.create({
      data: {
        id: jobId,
        groupId: Number(job.groupId || 0),
        customer: job.customer ? String(job.customer) : "",
        rate: toNumber(job.rate),
        cut: toNumber(job.cut),
        thickness: toNumber(job.thickness),
        passLevel: job.passLevel ? String(job.passLevel) : "1",
        setting: job.setting ? String(job.setting) : "0",
        qty: toInt(job.qty) ?? 1,
        sedm: job.sedm ? String(job.sedm) : "No",
        sedmSelectionType: job.sedmSelectionType ? String(job.sedmSelectionType) : "range",
        sedmRangeKey: job.sedmRangeKey ? String(job.sedmRangeKey) : "0.3-0.4",
        sedmStandardValue: job.sedmStandardValue ? String(job.sedmStandardValue) : "",
        sedmLengthType: job.sedmLengthType ? String(job.sedmLengthType) : "min",
        sedmOver20Length: toNumber(job.sedmOver20Length),
        sedmLengthValue: toNumber(job.sedmLengthValue),
        sedmHoles: toInt(job.sedmHoles) ?? 1,
        sedmEntriesJson: job.sedmEntriesJson ? String(job.sedmEntriesJson) : "",
        operationRowsJson: job.operationRowsJson ? String(job.operationRowsJson) : "",
        material: job.material ? String(job.material) : "",
        priority: job.priority ? String(job.priority) : "Low",
        description: job.description ? String(job.description) : "",
        programRefFile: job.programRefFile ? String(job.programRefFile) : "",
        cutImage: normalizeCutImage(job.cutImage),
        critical: Boolean(job.critical),
        pipFinish: Boolean(job.pipFinish),
        totalHrs: toNumber(job.totalHrs) ?? 0,
        totalAmount: toNumber(job.totalAmount) ?? 0,
        createdAt: toDate(job.createdAt),
        createdBy: job.createdBy ? String(job.createdBy) : "Unknown User",
        assignedTo: job.assignedTo ? String(job.assignedTo) : "Unassigned",
        refNumber: job.refNumber ? String(job.refNumber) : null,
        startTime: job.startTime ? String(job.startTime) : "",
        endTime: job.endTime ? String(job.endTime) : "",
        machineHrs: job.machineHrs ? String(job.machineHrs) : "",
        machineNumber: job.machineNumber ? String(job.machineNumber) : "",
        opsName: job.opsName ? String(job.opsName) : "",
        idleTime: job.idleTime ? String(job.idleTime) : "",
        idleTimeDuration: job.idleTimeDuration ? String(job.idleTimeDuration) : "",
        lastImage: job.lastImage ? String(job.lastImage) : null,
        qcDecision: job.qcDecision ? String(job.qcDecision) : "PENDING",
        qcReportClosed: Boolean(job.qcReportClosed),
        updatedBy: job.updatedBy ? String(job.updatedBy) : "",
        updatedAt: job.updatedAt ? toDate(job.updatedAt) : null,
        operatorCaptures: {
          create: captures.map((capture: any) => ({
            captureMode: capture.captureMode ? String(capture.captureMode) : "SINGLE",
            fromQty: Number(capture.fromQty || 1),
            toQty: Number(capture.toQty || capture.fromQty || 1),
            quantityCount: Number(capture.quantityCount || 1),
            startTime: capture.startTime ? String(capture.startTime) : "",
            endTime: capture.endTime ? String(capture.endTime) : "",
            machineHrs: capture.machineHrs ? String(capture.machineHrs) : "",
            machineNumber: capture.machineNumber ? String(capture.machineNumber) : "",
            opsName: capture.opsName ? String(capture.opsName) : "",
            idleTime: capture.idleTime ? String(capture.idleTime) : "",
            idleTimeDuration: capture.idleTimeDuration ? String(capture.idleTimeDuration) : "",
            lastImage: capture.lastImage ? String(capture.lastImage) : null,
            createdAt: capture.createdAt ? String(capture.createdAt) : "",
            createdBy: capture.createdBy ? String(capture.createdBy) : "",
          })),
        },
        qaStates: {
          create: qaStates.map((entry) => ({
            quantityNumber: entry.quantityNumber,
            status: entry.status,
          })),
        },
      },
    });
  }

  for (const log of employeeLogs) {
    const userId = toUuid(log.userId);
    const jobId = toUuid(log.jobId);
    const mappedUserId = userId ? userIdMap.get(userId) : undefined;
    const mappedJobId = jobId ? jobIdMap.get(jobId) : undefined;

    await prisma.employeeLog.create({
      data: {
        role: String(log.role || ""),
        activityType: String(log.activityType || ""),
        status: String(log.status || "COMPLETED"),
        userId: mappedUserId,
        userEmail: log.userEmail ? String(log.userEmail) : "",
        userName: log.userName ? String(log.userName) : "",
        jobId: mappedJobId,
        jobGroupId: toInt(log.jobGroupId),
        refNumber: log.refNumber ? String(log.refNumber) : "",
        settingLabel: log.settingLabel ? String(log.settingLabel) : "",
        quantityFrom: toInt(log.quantityFrom),
        quantityTo: toInt(log.quantityTo),
        quantityCount: toInt(log.quantityCount),
        jobCustomer: log.jobCustomer ? String(log.jobCustomer) : "",
        jobDescription: log.jobDescription ? String(log.jobDescription) : "",
        workItemTitle: log.workItemTitle ? String(log.workItemTitle) : "",
        workSummary: log.workSummary ? String(log.workSummary) : "",
        startedAt: toDate(log.startedAt),
        endedAt: log.endedAt ? toDate(log.endedAt) : null,
        durationSeconds: toInt(log.durationSeconds) ?? 0,
        metadata: (log.metadata as Record<string, any>) || {},
        createdAt: toDate(log.createdAt),
        updatedAt: toDate(log.updatedAt),
      },
    });
  }

  if (masterConfigs.length > 0) {
    const config = masterConfigs[0];

    const base = await prisma.masterConfig.upsert({
      where: { key: "global" },
      update: {
        settingHoursPerSetting: toNumber(config.settingHoursPerSetting),
        complexExtraHours: toNumber(config.complexExtraHours),
        pipExtraHours: toNumber(config.pipExtraHours),
      },
      create: {
        key: "global",
        settingHoursPerSetting: toNumber(config.settingHoursPerSetting),
        complexExtraHours: toNumber(config.complexExtraHours),
        pipExtraHours: toNumber(config.pipExtraHours),
      },
    });

    const masterConfigId = base.id;
    await prisma.masterConfigCustomer.deleteMany({ where: { masterConfigId } });
    await prisma.masterConfigMaterial.deleteMany({ where: { masterConfigId } });
    await prisma.masterConfigPassOption.deleteMany({ where: { masterConfigId } });
    await prisma.masterConfigSedmElectrodeOption.deleteMany({ where: { masterConfigId } });
    await prisma.masterConfigMachineOption.deleteMany({ where: { masterConfigId } });
    await prisma.masterConfigSedmThOption.deleteMany({ where: { masterConfigId } });

    await prisma.masterConfigCustomer.createMany({
      data: Array.isArray(config.customers)
        ? config.customers.map((c: any) => ({
            masterConfigId,
            customer: String(c.customer || ""),
            rate: c.rate ? String(c.rate) : null,
          }))
        : [],
    });
    await prisma.masterConfigMaterial.createMany({
      data: Array.isArray(config.materials)
        ? config.materials.map((value: any) => ({ masterConfigId, value: String(value) }))
        : [],
    });
    await prisma.masterConfigPassOption.createMany({
      data: Array.isArray(config.passOptions)
        ? config.passOptions.map((value: any) => ({ masterConfigId, value: String(value) }))
        : [],
    });
    await prisma.masterConfigSedmElectrodeOption.createMany({
      data: Array.isArray(config.sedmElectrodeOptions)
        ? config.sedmElectrodeOptions.map((value: any) => ({ masterConfigId, value: String(value) }))
        : [],
    });
    await prisma.masterConfigMachineOption.createMany({
      data: Array.isArray(config.machineOptions)
        ? config.machineOptions.map((value: any) => ({ masterConfigId, value: String(value) }))
        : [],
    });
    await prisma.masterConfigSedmThOption.createMany({
      data: Array.isArray(config.sedmThOptions)
        ? config.sedmThOptions.map((opt: any) => ({
            masterConfigId,
            value: String(opt.value || ""),
            label: String(opt.label || ""),
          }))
        : [],
    });
  }

  for (const config of idleTimeConfigs) {
    const idleTimeType = String(config.idleTimeType || "");
    if (!idleTimeType) continue;
    await prisma.idleTimeConfig.upsert({
      where: { idleTimeType },
      update: { durationMinutes: toInt(config.durationMinutes) ?? 0 },
      create: { idleTimeType, durationMinutes: toInt(config.durationMinutes) ?? 0 },
    });
  }

  for (const counter of counters) {
    const key = String(counter.key || "");
    if (!key) continue;
    await prisma.counter.upsert({
      where: { key },
      update: { seq: Number(counter.seq || 0) },
      create: { key, seq: Number(counter.seq || 0) },
    });
  }

  await prisma.$disconnect();
  console.log("Migration complete.");
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
