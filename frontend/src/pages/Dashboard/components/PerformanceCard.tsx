import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import type { DashboardTopPerformer } from "../../../types/dashboard";

type PerformanceCardProps = {
  title: string;
  performer: DashboardTopPerformer | null;
};

const PerformanceCard = ({ title, performer }: PerformanceCardProps) => {
  if (!performer) {
    return (
      <article className="dashboard-glow-card dashboard-performer-card empty">
        <span className="dashboard-card-kicker">{title}</span>
        <strong>No data yet</strong>
        <p>Performance ranking appears once enough activity is logged.</p>
      </article>
    );
  }

  return (
    <article className="dashboard-glow-card dashboard-performer-card">
      <span className="dashboard-card-kicker">{title}</span>
      <div className="dashboard-performer-row">
        <div className="dashboard-avatar-orb">
          {performer.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <strong>{performer.name}</strong>
          <p>{performer.metricLabel}</p>
        </div>
        <div className="dashboard-performer-score">
          <ArrowOutwardRoundedIcon sx={{ fontSize: "1rem" }} />
          <span>{performer.metricValue.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </article>
  );
};

export default PerformanceCard;
