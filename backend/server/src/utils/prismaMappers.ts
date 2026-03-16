import { formatDbDateTime } from "./dateTime";

const toId = (record: any) => {
  if (!record) return record;
  return { ...record, _id: record.id };
};

const decimalToString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

export const mapUser = (user: any) => {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return { ...rest, _id: user.id };
};

export const mapEmployeeLog = (log: any) => {
  if (!log) return log;
  return toId(log);
};

export const mapJob = (job: any) => {
  if (!job) return job;

  const qaStates: Record<string, string> = {};
  if (Array.isArray(job.qaStates)) {
    job.qaStates.forEach((entry: any) => {
      if (entry && entry.quantityNumber !== undefined && entry.status) {
        qaStates[String(entry.quantityNumber)] = entry.status;
      }
    });
  }

  const operatorCaptures = Array.isArray(job.operatorCaptures)
    ? job.operatorCaptures.map((capture: any) => {
        const { jobId, job: _job, ...rest } = capture;
        return { ...rest, _id: capture.id };
      })
    : [];

  const { operatorCaptures: _captures, qaStates: _qaStates, ...base } = job;
  const createdAt = base.createdAt ? formatDbDateTime(new Date(base.createdAt)) : "";
  const updatedAt = base.updatedAt ? formatDbDateTime(new Date(base.updatedAt)) : "";

  return {
    ...base,
    _id: base.id,
    createdAt,
    updatedAt: updatedAt || base.updatedAt || "",
    operatorCaptures,
    quantityQaStates: qaStates,
    rate: decimalToString(base.rate),
    cut: decimalToString(base.cut),
    thickness: decimalToString(base.thickness),
    passLevel: base.passLevel !== null && base.passLevel !== undefined ? String(base.passLevel) : "",
    setting: base.setting !== null && base.setting !== undefined ? String(base.setting) : "",
    qty: base.qty !== null && base.qty !== undefined ? String(base.qty) : "",
    sedmOver20Length: decimalToString(base.sedmOver20Length),
    sedmLengthValue: decimalToString(base.sedmLengthValue),
    sedmHoles: base.sedmHoles !== null && base.sedmHoles !== undefined ? String(base.sedmHoles) : "",
    totalHrs: base.totalHrs !== null && base.totalHrs !== undefined ? Number(base.totalHrs) : 0,
    totalAmount: base.totalAmount !== null && base.totalAmount !== undefined ? Number(base.totalAmount) : 0,
  };
};
