import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CancelPresentationRoundedIcon from "@mui/icons-material/CancelPresentationRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import type { ElementType } from "react";
import type { DashboardActivityItem } from "../../../types/dashboard";
import { formatDateTime } from "../utils/metricsCalculator";

type ActivityFeedProps = {
  items: DashboardActivityItem[];
};

const iconByKind: Record<string, ElementType> = {
  JOB_CREATED: CodeRoundedIcon,
  OPERATOR_STARTED: BuildCircleOutlinedIcon,
  JOB_COMPLETED: CheckCircleOutlineRoundedIcon,
  QC_APPROVED: CheckCircleOutlineRoundedIcon,
  QC_REJECTED: CancelPresentationRoundedIcon,
  ACTIVITY: AccessTimeRoundedIcon,
};

const ActivityFeed = ({ items }: ActivityFeedProps) => {
  return (
    <article className="dashboard-glow-card dashboard-feed-card">
      <div className="dashboard-section-head compact">
        <div>
          <span className="dashboard-section-eyebrow">Live Feed</span>
          <h3>Recent activity</h3>
        </div>
      </div>
      <div className="dashboard-feed-list">
        {items.length === 0 ? (
          <div className="dashboard-empty-state">No recent actions yet.</div>
        ) : (
          items.map((item) => {
            const Icon = iconByKind[item.kind] || AccessTimeRoundedIcon;
            return (
              <div key={item.id} className="dashboard-feed-item">
                <div className="dashboard-feed-icon">
                  <Icon sx={{ fontSize: "1rem" }} />
                </div>
                <div className="dashboard-feed-copy">
                  <strong>{item.action}</strong>
                  <span>{item.actor} · {item.title}</span>
                  <p>{item.subtitle}</p>
                </div>
                <small>{formatDateTime(item.occurredAt)}</small>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
};

export default ActivityFeed;
