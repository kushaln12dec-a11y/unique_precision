import { Link } from "react-router-dom";
import { formatJobRefDisplay } from "../utils/jobFormatting";
import type { EmployeeLogRole } from "../types/employeeLog";

type JobRefLinkProps = {
  role?: EmployeeLogRole | string;
  jobGroupId?: string | number | null;
  jobId?: string | number | null;
  refNumber?: string | null;
  fallbackLabel?: string | null;
  className?: string;
};

export const getJobLogDestination = ({
  role,
  jobGroupId,
  jobId,
}: {
  role?: string;
  jobGroupId?: string | number | null;
  jobId?: string | number | null;
}) => {
  const normalizedRole = String(role || "").toUpperCase();
  const groupId = String(jobGroupId || "").trim();
  const cutId = String(jobId || "").trim();

  if (normalizedRole === "OPERATOR" && groupId) {
    const params = new URLSearchParams({ groupId });
    if (cutId) params.set("cutId", cutId);
    return `/operator/viewpage?${params.toString()}`;
  }

  if (normalizedRole === "PROGRAMMER" && groupId) {
    return `/programmer/edit/${groupId}`;
  }

  if (normalizedRole === "QC") {
    return "/qc";
  }

  return "";
};

const JobRefLink = ({
  role,
  jobGroupId,
  jobId,
  refNumber,
  fallbackLabel,
  className = "",
}: JobRefLinkProps) => {
  const formattedLabel =
    formatJobRefDisplay(String(refNumber || "").trim()) ||
    formatJobRefDisplay(String(fallbackLabel || "").trim()) ||
    "-";
  const to = getJobLogDestination({ role, jobGroupId, jobId });

  if (!to || formattedLabel === "-") {
    return <span>{formattedLabel}</span>;
  }

  return (
    <Link className={`job-ref-link ${className}`.trim()} to={to}>
      {formattedLabel}
    </Link>
  );
};

export default JobRefLink;
