import React from "react";
import { getInitials } from "../utils/jobFormatting";
import "./CreatedByBadge.css";

type CreatedByBadgeProps = {
  value?: unknown;
  className?: string;
};

const CreatedByBadge: React.FC<CreatedByBadgeProps> = ({ value, className = "created-by-badge" }) => {
  const fullName = String(value || "-").trim() || "-";

  return (
    <span className={className} title={fullName.toUpperCase()}>
      {getInitials(fullName)}
    </span>
  );
};

export default CreatedByBadge;
