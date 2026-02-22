export type EmployeeLogRole = "PROGRAMMER" | "OPERATOR" | "QC";
export type EmployeeLogStatus = "IN_PROGRESS" | "COMPLETED";
export type EmployeeLogActivityType =
  | "PROGRAMMER_JOB_CREATION"
  | "OPERATOR_PRODUCTION"
  | "QA_REVIEW";

export type EmployeeLog = {
  _id: string;
  role: EmployeeLogRole;
  activityType: EmployeeLogActivityType;
  status: EmployeeLogStatus;
  userId: string;
  userEmail: string;
  userName: string;
  jobGroupId?: number | null;
  jobId?: string;
  refNumber?: string;
  settingLabel?: string;
  quantityFrom?: number | null;
  quantityTo?: number | null;
  quantityCount?: number | null;
  jobCustomer?: string;
  jobDescription?: string;
  workItemTitle?: string;
  workSummary?: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};
