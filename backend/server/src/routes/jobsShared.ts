import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { parseDisplayDateTime } from "../utils/dateTime";
import { requireBigInt, toBigInt } from "../utils/bigint";
import { resolveStoredFile } from "../utils/objectStorage";

export const JOB_REF_KEY = "jobRef";
export const JOB_REF_REGEX = /^JOB-\d{5}$/;

export const jobInclude: Prisma.JobInclude = {
  operatorCaptures: { orderBy: { createdAt: "asc" } },
  qaStates: true,
};

export const programmerListSelect = {
  id: true,
  groupId: true,
  customer: true,
  rate: true,
  cut: true,
  thickness: true,
  passLevel: true,
  setting: true,
  qty: true,
  sedm: true,
  material: true,
  priority: true,
  description: true,
  programRefFile: true,
  operationRowsJson: true,
  critical: true,
  pipFinish: true,
  totalHrs: true,
  totalAmount: true,
  createdAt: true,
  createdBy: true,
  assignedTo: true,
  refNumber: true,
  updatedBy: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

export const operatorListSelect = {
  ...programmerListSelect,
  machineNumber: true,
  qcDecision: true,
  qcReportClosed: true,
  qaStates: {
    select: {
      quantityNumber: true,
      status: true,
    },
  },
  operatorCaptures: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      machineNumber: true,
      createdAt: true,
    },
  },
} satisfies Prisma.JobSelect;

export const qcListSelect = {
  id: true,
  groupId: true,
  customer: true,
  description: true,
  refNumber: true,
  programRefFile: true,
  qty: true,
  setting: true,
  cut: true,
  assignedTo: true,
  createdAt: true,
  qcDecision: true,
  qcReportClosed: true,
  priority: true,
  critical: true,
  qaStates: {
    select: {
      quantityNumber: true,
      status: true,
    },
  },
} satisfies Prisma.JobSelect;

export const formatJobRef = (seq: number) => `JOB-${String(seq).padStart(5, "0")}`;

export const getNextJobRef = async (): Promise<string> => {
  const counter = await prisma.counter.upsert({
    where: { key: JOB_REF_KEY },
    update: { seq: { increment: 1 } },
    create: { key: JOB_REF_KEY, seq: 1 },
  });
  return formatJobRef(Number(counter.seq || 1));
};

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const toInt = (value: unknown): number | null => {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
};

export const parseGroupIdParam = (value: unknown): bigint | null => {
  const parsed = toBigInt(value);
  return parsed ?? null;
};

export const resolveReqUserName = (reqUser: any): string => {
  const fullName = String(reqUser?.fullName || "").trim();
  if (fullName) return fullName;
  const firstName = String(reqUser?.firstName || "").trim();
  const lastName = String(reqUser?.lastName || "").trim();
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined;
  const email = String(reqUser?.email || "").trim();
  return email.split("@")[0]?.trim() || "";
};

export const normalizeJobInput = async (job: any) => {
  const createdAt = parseDisplayDateTime(job.createdAt) ?? new Date();
  const cutImage = Array.isArray(job.cutImage) ? (job.cutImage[0] || "") : job.cutImage;
  const cutImageUrl = await resolveStoredFile(cutImage, "jobs/cut-images");
  const lastImageUrl = await resolveStoredFile(job.lastImage, "jobs/last-images");
  const parsedUpdatedAt = job.updatedAt ? parseDisplayDateTime(job.updatedAt) : null;
  return {
    groupId: requireBigInt(job.groupId, "groupId"),
    customer: job.customer ?? "",
    rate: toNumber(job.rate),
    cut: toNumber(job.cut),
    thickness: toNumber(job.thickness),
    passLevel: job.passLevel !== undefined && job.passLevel !== null ? String(job.passLevel) : "1",
    setting: job.setting !== undefined && job.setting !== null ? String(job.setting) : "0",
    qty: toInt(job.qty) ?? 1,
    sedm: job.sedm ?? "No",
    sedmSelectionType: job.sedmSelectionType ?? "range",
    sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
    sedmStandardValue: job.sedmStandardValue ?? "",
    sedmLengthType: job.sedmLengthType ?? "min",
    sedmOver20Length: toNumber(job.sedmOver20Length),
    sedmLengthValue: toNumber(job.sedmLengthValue),
    sedmHoles: toInt(job.sedmHoles) ?? 1,
    sedmEntriesJson: job.sedmEntriesJson ?? "",
    operationRowsJson: job.operationRowsJson ?? "",
    material: job.material ?? "",
    priority: job.priority ?? "Low",
    description: job.description ?? "",
    programRefFile: job.programRefFile ?? "",
    cutImage: cutImageUrl ?? null,
    critical: Boolean(job.critical),
    pipFinish: Boolean(job.pipFinish),
    totalHrs: toNumber(job.totalHrs) ?? 0,
    totalAmount: toNumber(job.totalAmount) ?? 0,
    createdAt,
    createdBy: job.createdBy ?? "Unknown User",
    assignedTo: job.assignedTo ?? "Unassigned",
    refNumber: job.refNumber ?? "",
    startTime: job.startTime ?? "",
    endTime: job.endTime ?? "",
    machineHrs: job.machineHrs ?? "",
    machineNumber: job.machineNumber ?? "",
    opsName: job.opsName ?? "",
    idleTime: job.idleTime ?? "",
    idleTimeDuration: job.idleTimeDuration ?? "",
    lastImage: lastImageUrl ?? null,
    qcDecision: job.qcDecision ?? "PENDING",
    qcReportClosed: Boolean(job.qcReportClosed),
    updatedBy: job.updatedBy ?? "",
    ...(parsedUpdatedAt ? { updatedAt: parsedUpdatedAt } : {}),
  };
};

export const normalizeJobUpdate = async (job: any) => {
  const data: any = {};
  if (job.groupId !== undefined) data.groupId = requireBigInt(job.groupId, "groupId");
  if (job.customer !== undefined) data.customer = job.customer ?? "";
  if (job.rate !== undefined) data.rate = toNumber(job.rate);
  if (job.cut !== undefined) data.cut = toNumber(job.cut);
  if (job.thickness !== undefined) data.thickness = toNumber(job.thickness);
  if (job.passLevel !== undefined) data.passLevel = job.passLevel !== null ? String(job.passLevel) : "";
  if (job.setting !== undefined) data.setting = job.setting !== null ? String(job.setting) : "";
  if (job.qty !== undefined) data.qty = toInt(job.qty);
  if (job.sedm !== undefined) data.sedm = job.sedm ?? "No";
  if (job.sedmSelectionType !== undefined) data.sedmSelectionType = job.sedmSelectionType ?? "range";
  if (job.sedmRangeKey !== undefined) data.sedmRangeKey = job.sedmRangeKey ?? "0.3-0.4";
  if (job.sedmStandardValue !== undefined) data.sedmStandardValue = job.sedmStandardValue ?? "";
  if (job.sedmLengthType !== undefined) data.sedmLengthType = job.sedmLengthType ?? "min";
  if (job.sedmOver20Length !== undefined) data.sedmOver20Length = toNumber(job.sedmOver20Length);
  if (job.sedmLengthValue !== undefined) data.sedmLengthValue = toNumber(job.sedmLengthValue);
  if (job.sedmHoles !== undefined) data.sedmHoles = toInt(job.sedmHoles);
  if (job.sedmEntriesJson !== undefined) data.sedmEntriesJson = job.sedmEntriesJson ?? "";
  if (job.operationRowsJson !== undefined) data.operationRowsJson = job.operationRowsJson ?? "";
  if (job.material !== undefined) data.material = job.material ?? "";
  if (job.priority !== undefined) data.priority = job.priority ?? "Low";
  if (job.description !== undefined) data.description = job.description ?? "";
  if (job.programRefFile !== undefined) data.programRefFile = job.programRefFile ?? "";
  if (job.cutImage !== undefined) {
    const cutImage = Array.isArray(job.cutImage) ? (job.cutImage[0] || "") : job.cutImage;
    data.cutImage = await resolveStoredFile(cutImage, "jobs/cut-images");
  }
  if (job.critical !== undefined) data.critical = Boolean(job.critical);
  if (job.pipFinish !== undefined) data.pipFinish = Boolean(job.pipFinish);
  if (job.totalHrs !== undefined) data.totalHrs = toNumber(job.totalHrs) ?? 0;
  if (job.totalAmount !== undefined) data.totalAmount = toNumber(job.totalAmount) ?? 0;
  if (job.createdAt !== undefined) data.createdAt = parseDisplayDateTime(job.createdAt) ?? new Date();
  if (job.createdBy !== undefined) data.createdBy = job.createdBy ?? "Unknown User";
  if (job.assignedTo !== undefined) data.assignedTo = job.assignedTo ?? "Unassigned";
  if (job.refNumber !== undefined) data.refNumber = job.refNumber ?? "";
  if (job.startTime !== undefined) data.startTime = job.startTime ?? "";
  if (job.endTime !== undefined) data.endTime = job.endTime ?? "";
  if (job.machineHrs !== undefined) data.machineHrs = job.machineHrs ?? "";
  if (job.machineNumber !== undefined) data.machineNumber = job.machineNumber ?? "";
  if (job.opsName !== undefined) data.opsName = job.opsName ?? "";
  if (job.idleTime !== undefined) data.idleTime = job.idleTime ?? "";
  if (job.idleTimeDuration !== undefined) data.idleTimeDuration = job.idleTimeDuration ?? "";
  if (job.lastImage !== undefined) {
    data.lastImage = await resolveStoredFile(job.lastImage, "jobs/last-images");
  }
  if (job.qcDecision !== undefined) data.qcDecision = job.qcDecision ?? "PENDING";
  if (job.qcReportClosed !== undefined) data.qcReportClosed = Boolean(job.qcReportClosed);
  if (job.updatedBy !== undefined) data.updatedBy = job.updatedBy ?? "";
  if (job.updatedAt !== undefined) data.updatedAt = parseDisplayDateTime(job.updatedAt) ?? new Date();
  return data;
};

export const buildJobWhere = (req: any) => {
  const where: any = {};

  if (req.query.customer) {
    where.customer = { contains: String(req.query.customer), mode: "insensitive" };
  }
  if (req.query.description) {
    where.description = { contains: String(req.query.description), mode: "insensitive" };
  }
  if (req.query.createdBy) {
    where.createdBy = String(req.query.createdBy);
  }
  if (req.query.assignedTo) {
    const assignedTo = String(req.query.assignedTo).trim();
    if (/^unassign(?:ed)?$/i.test(assignedTo)) {
      where.OR = [{ assignedTo: "Unassign" }, { assignedTo: "Unassigned" }];
    } else {
      where.assignedTo = assignedTo;
    }
  }

  const numberRangeFields = ["cut", "thickness", "qty", "rate", "totalHrs", "totalAmount"];
  numberRangeFields.forEach((field) => {
    const minKey = `${field}_min`;
    const maxKey = `${field}_max`;
    if (req.query[minKey] !== undefined || req.query[maxKey] !== undefined) {
      const range: any = {};
      const minValue = toNumber(req.query[minKey]);
      const maxValue = toNumber(req.query[maxKey]);
      if (minValue !== null) range.gte = minValue;
      if (maxValue !== null) range.lte = maxValue;
      if (Object.keys(range).length > 0) where[field] = range;
    }
  });

  if (req.query.passLevel) where.passLevel = String(req.query.passLevel);
  if (req.query.setting) where.setting = { contains: String(req.query.setting), mode: "insensitive" };
  if (req.query.priority) where.priority = String(req.query.priority);
  if (req.query.critical !== undefined) where.critical = req.query.critical === "true";
  if (req.query.pipFinish !== undefined) where.pipFinish = req.query.pipFinish === "true";
  if (req.query.sedm) where.sedm = String(req.query.sedm);

  if (req.query.createdAt_min || req.query.createdAt_max) {
    const range: any = {};
    if (req.query.createdAt_min) {
      const start = new Date(String(req.query.createdAt_min));
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        range.gte = start;
      }
    }
    if (req.query.createdAt_max) {
      const end = new Date(String(req.query.createdAt_max));
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
    }
    if (Object.keys(range).length > 0) where.createdAt = range;
  }

  return where;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : fallback;
};

const parseNonNegativeInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  return normalized >= 0 ? normalized : fallback;
};

export const getPagination = (req: any, defaultLimit = 15, maxLimit = 100) => {
  const limit = Math.min(parsePositiveInt(req.query.limit, defaultLimit), maxLimit);
  const offset = parseNonNegativeInt(req.query.offset, 0);
  return { limit, offset };
};

export const createPaginatedResponse = <T,>(items: T[], total: number, offset: number, limit: number) => ({
  items,
  total,
  offset,
  limit,
  hasMore: offset + items.length < total,
});

export const getPagedGroupIds = async (where: Prisma.JobWhereInput, offset: number, limit: number) => {
  const [allGroups, pagedGroups] = await Promise.all([
    prisma.job.groupBy({ by: ["groupId"], where }),
    prisma.job.groupBy({
      by: ["groupId"],
      where,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    totalGroups: allGroups.length,
    groupIds: pagedGroups.map((group) => group.groupId),
  };
};
