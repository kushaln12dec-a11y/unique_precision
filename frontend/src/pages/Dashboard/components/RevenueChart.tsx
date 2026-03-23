import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DashboardOption } from "../../../types/dashboard";

type RevenueChartProps = {
  title: string;
  data: DashboardOption[];
};

const palette = ["#22d3ee", "#818cf8", "#f472b6", "#60a5fa", "#a78bfa", "#fb7185"];

const RevenueChart = ({ title, data }: RevenueChartProps) => {
  return (
    <article className="dashboard-glow-card dashboard-chart-card">
      <div className="dashboard-section-head compact">
        <div>
          <span className="dashboard-section-eyebrow">Revenue Breakdown</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="dashboard-chart-shell">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={104}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              contentStyle={{
                background: "rgba(9, 12, 26, 0.94)",
                border: "1px solid rgba(125, 211, 252, 0.22)",
                borderRadius: "16px",
                color: "#f8fafc",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default RevenueChart;
