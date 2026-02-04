import React from "react";
import type { JobEntry } from "../../../types/job";
import { formatDate } from "../utils/dateFormat";
import "../OperatorViewPage.css";

type OperatorJobInfoProps = {
  parentJob: JobEntry;
  groupId: string | null;
};

export const OperatorJobInfo: React.FC<OperatorJobInfoProps> = ({ parentJob, groupId }) => {
  return (
    <div className="operator-job-info-section">
      <h3 className="operator-section-title">Job Information</h3>
      <div className="operator-job-info-grid">
        <div className="operator-info-card">
          <label>Customer</label>
          <span>{parentJob.customer || "—"}</span>
        </div>
        <div className="operator-info-card">
          <label>Created By</label>
          <span>{parentJob.createdBy || "—"}</span>
        </div>
        <div className="operator-info-card">
          <label>Created At</label>
          <span>{formatDate(parentJob.createdAt)}</span>
        </div>
        {(parentJob as any)?.updatedBy && (
          <div className="operator-info-card">
            <label>Updated By</label>
            <span>{(parentJob as any).updatedBy || "—"}</span>
          </div>
        )}
        {(parentJob as any)?.updatedAt && (
          <div className="operator-info-card">
            <label>Updated At</label>
            <span>{formatDate((parentJob as any).updatedAt)}</span>
          </div>
        )}
        <div className="operator-info-card">
          <label>Ref Number</label>
          <span>#{(parentJob as any)?.refNumber || groupId || "—"}</span>
        </div>
        <div className="operator-info-card">
          <label>Priority</label>
          <span className={`priority-badge priority-${(parentJob.priority || "").toLowerCase()}`}>
            {parentJob.priority || "—"}
          </span>
        </div>
        <div className="operator-info-card">
          <label>Complex</label>
          <span className={parentJob.critical ? "complex-badge yes" : "complex-badge no"}>
            {parentJob.critical ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </div>
  );
};
