import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type JobTimelineProps = {
  title: string;
  subtitle: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKeys: Array<{ key: string; label: string; color: string }>;
  variant?: "line" | "area";
};

const JobTimeline = ({
  title,
  subtitle,
  data,
  xKey,
  yKeys,
  variant = "line",
}: JobTimelineProps) => {
  const Chart = variant === "area" ? AreaChart : LineChart;

  return (
    <article className="dashboard-glow-card dashboard-chart-card">
      <div className="dashboard-section-head compact">
        <div>
          <span className="dashboard-section-eyebrow">Trend View</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="dashboard-chart-shell">
        <ResponsiveContainer width="100%" height={280}>
          <Chart data={data}>
            <defs>
              {yKeys.map((series) => (
                <linearGradient key={series.key} id={`gradient-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(9, 12, 26, 0.94)",
                border: "1px solid rgba(125, 211, 252, 0.22)",
                borderRadius: "16px",
                color: "#f8fafc",
              }}
            />
            {variant === "area"
              ? yKeys.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    fill={`url(#gradient-${series.key})`}
                    strokeWidth={2.5}
                  />
                ))
              : yKeys.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
          </Chart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default JobTimeline;
