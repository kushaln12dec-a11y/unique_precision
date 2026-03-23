import { useEffect, useState, type ReactNode } from "react";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";

type MetricsCardProps = {
  title: string;
  value: string;
  numericValue?: number;
  subtitle?: string;
  tone?: "cyan" | "violet" | "pink" | "blue";
  trendValue?: number;
  icon: ReactNode;
};

const MetricsCard = ({
  title,
  value,
  numericValue,
  subtitle,
  tone = "cyan",
  trendValue,
  icon,
}: MetricsCardProps) => {
  const [displayValue, setDisplayValue] = useState(numericValue ?? 0);

  useEffect(() => {
    if (numericValue === undefined) return;
    let frame = 0;
    const duration = 600;
    const start = performance.now();
    const origin = displayValue;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      setDisplayValue(origin + (numericValue - origin) * progress);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [numericValue]);

  const TrendIcon = (trendValue || 0) >= 0 ? TrendingUpRoundedIcon : TrendingDownRoundedIcon;

  return (
    <article className={`dashboard-glow-card dashboard-metrics-card tone-${tone}`}>
      <div className="dashboard-card-icon">{icon}</div>
      <div className="dashboard-card-copy">
        <span className="dashboard-card-kicker">{title}</span>
        <strong className="dashboard-card-value">
          {numericValue === undefined ? value : value.replace(String(numericValue), Math.round(displayValue).toLocaleString("en-IN"))}
        </strong>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {trendValue !== undefined ? (
        <div className={`dashboard-card-trend ${(trendValue || 0) >= 0 ? "up" : "down"}`}>
          <TrendIcon sx={{ fontSize: "1rem" }} />
          <span>{Math.abs(trendValue).toFixed(1)}%</span>
        </div>
      ) : null}
    </article>
  );
};

export default MetricsCard;
