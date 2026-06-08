import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DashboardOption } from "../../../types/dashboard";

type JobStatusBreakdownProps = {
  title: string;
  data: DashboardOption[];
};

const colors = ["#38bdf8", "#818cf8", "#34d399", "#fb7185", "#f59e0b"];

const JobStatusBreakdown = ({ title, data }: JobStatusBreakdownProps) => {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <article className="dashboard-glow-card dashboard-chart-card">
      <div className="dashboard-section-head compact">
        <div>
          <span className="dashboard-section-eyebrow">Status Breakdown</span>
          <h3>{title}</h3>
        </div>
        <div className="dashboard-inline-stat">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <div className="dashboard-chart-shell compact">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "16px",
                color: "#0f172a",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="dashboard-chip-list">
        {data.map((item, index) => (
          <span key={item.name} className="dashboard-info-chip">
            <i style={{ background: colors[index % colors.length] }} />
            {item.name} · {item.value}
          </span>
        ))}
      </div>
    </article>
  );
};

export default JobStatusBreakdown;
