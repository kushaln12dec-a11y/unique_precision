import { formatDbDateTime } from "./dateTime";

const toId = (record: any) => {
  if (!record) return record;
  return { ...record, _id: record.id };
};

const decimalToString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const mapJobCore = (job: any) => {
  const createdAt = job.createdAt ? formatDbDateTime(new Date(job.createdAt)) : "";
  const updatedAt = job.updatedAt ? formatDbDateTime(new Date(job.updatedAt)) : "";

  return {
    ...job,
    _id: job.id,
    createdAt,
    updatedAt: updatedAt || job.updatedAt || "",
    rate: decimalToString(job.rate),
    cut: decimalToString(job.cut),
    thickness: decimalToString(job.thickness),
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
  return {
    ...rest,
    _id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    empId: user.empId ?? "",
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
