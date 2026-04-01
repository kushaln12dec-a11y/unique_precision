import { formatDbDateTime } from "./dateTime";
import { normalizeEmpId } from "./employeeId";

const AUTO_GENERATED_EMP_EMAIL_REGEX = /^emp\d{4}(?:\+\d+)?@uniqueprecision\.local$/i;

const toId = (record: any) => {
  if (!record) return record;
  return { ...record, _id: record.id };
};

const decimalToString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const getThicknessFromOperationRows = (operationRowsJson: unknown): string => {
  const raw = String(operationRowsJson || "").trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return "";
    const firstRow = parsed.find((row) => row && typeof row === "object");
    if (!firstRow) return "";
    return String((firstRow as any).thickness ?? (firstRow as any).thk ?? "").trim();
  } catch {
    return "";
  }
};

const mapJobCore = (job: any) => {
  const createdAt = job.createdAt ? formatDbDateTime(new Date(job.createdAt)) : "";
  const updatedAt = job.updatedAt ? formatDbDateTime(new Date(job.updatedAt)) : "";
  const storedThickness = decimalToString(job.thickness);
  const operationRowThickness = getThicknessFromOperationRows(job.operationRowsJson);
  const thickness = operationRowThickness || storedThickness;

  return {
    ...job,
    _id: job.id,
    createdAt,
    updatedAt: updatedAt || job.updatedAt || "",
    rate: decimalToString(job.rate),
    cut: decimalToString(job.cut),
    thickness,
    passLevel: job.passLevel !== null && job.passLevel !== undefined ? String(job.passLevel) : "",
    setting: job.setting !== null && job.setting !== undefined ? String(job.setting) : "",
    qty: job.qty !== null && job.qty !== undefined ? String(job.qty) : "",
    sedmOver20Length: decimalToString(job.sedmOver20Length),
    sedmLengthValue: decimalToString(job.sedmLengthValue),
    sedmHoles: job.sedmHoles !== null && job.sedmHoles !== undefined ? String(job.sedmHoles) : "",
    totalHrs: job.totalHrs !== null && job.totalHrs !== undefined ? Number(job.totalHrs) : 0,
    totalAmount: job.totalAmount !== null && job.totalAmount !== undefined ? Number(job.totalAmount) : 0,
  };
};

const mapQaStates = (job: any) => {
  const qaStates: Record<string, string> = {};
  if (Array.isArray(job.qaStates)) {
    job.qaStates.forEach((entry: any) => {
      if (entry && entry.quantityNumber !== undefined && entry.status) {
        qaStates[String(entry.quantityNumber)] = entry.status;
      }
    });
  }
  return qaStates;
};

const mapOperatorCaptures = (job: any) => {
  return Array.isArray(job.operatorCaptures)
    ? job.operatorCaptures.map((capture: any) => {
        const { jobId, job: _job, ...rest } = capture;
        return { ...rest, _id: capture.id };
      })
    : [];
};

export const mapUser = (user: any) => {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  const rawEmail = String(user.email ?? "").trim().toLowerCase();
  const email = AUTO_GENERATED_EMP_EMAIL_REGEX.test(rawEmail) ? "" : rawEmail;
  return {
    ...rest,
    _id: user.id,
    email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    empId: normalizeEmpId(user.empId) || "",
    image: user.image ?? "",
    role: user.role ?? "OPERATOR",
  };
};

export const mapEmployeeLog = (log: any) => {
  if (!log) return log;
  return toId(log);
};

export const mapJob = (job: any) => {
  if (!job) return job;
  return {
    ...mapJobCore(job),
    operatorCaptures: mapOperatorCaptures(job),
    quantityQaStates: mapQaStates(job),
  };
};

export const mapJobList = (job: any) => {
  if (!job) return job;
  return mapJobCore(job);
};

export const mapOperatorJobList = (job: any) => {
  if (!job) return job;
  return {
    ...mapJobCore(job),
    operatorCaptures: mapOperatorCaptures(job),
    quantityQaStates: mapQaStates(job),
  };
};

export const mapQcJobList = (job: any) => {
  if (!job) return job;
  return {
    ...mapJobCore(job),
    quantityQaStates: mapQaStates(job),
  };
};
