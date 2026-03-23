import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import type { DashboardAdminData } from "../../types/dashboard";
import ActivityFeed from "./components/ActivityFeed";
import JobTimeline from "./components/JobTimeline";
import MetricsCard from "./components/MetricsCard";
import RevenueChart from "./components/RevenueChart";
import TopPerformersSection from "./components/TopPerformersSection";
import { formatCurrency, formatHours, formatPercent } from "./utils/metricsCalculator";

type AdminDashboardProps = {
  data: DashboardAdminData;
};

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  return (
    <div className="dashboard-view-stack">
      <section className="dashboard-metrics-grid">
        <MetricsCard
          title="Revenue Pulse"
          value={formatCurrency(data.metrics.totalRevenue.today)}
          subtitle={`Month ${formatCurrency(data.metrics.totalRevenue.month)} · YTD ${formatCurrency(data.metrics.totalRevenue.ytd)}`}
          trendValue={data.metrics.comparisonDelta}
          icon={<PaidOutlinedIcon />}
          tone="cyan"
        />
        <MetricsCard
          title="Jobs Created"
          value={data.metrics.totalJobsCreatedThisMonth.toLocaleString("en-IN")}
          numericValue={data.metrics.totalJobsCreatedThisMonth}
          subtitle="This month"
          icon={<AssignmentTurnedInOutlinedIcon />}
          tone="violet"
        />
        <MetricsCard
          title="Completion Split"
          value={`${data.metrics.jobsCompleted} / ${data.metrics.jobsInProgress}`}
          subtitle="Completed vs in progress"
          icon={<TaskAltOutlinedIcon />}
          tone="blue"
        />
        <MetricsCard
          title="QC Pass Rate"
          value={formatPercent(data.metrics.qcPassRate)}
          subtitle="Approved after inspection"
          icon={<QueryStatsOutlinedIcon />}
          tone="pink"
        />
        <MetricsCard
          title="Machine Hours"
          value={formatHours(data.metrics.totalMachineHoursToday)}
          subtitle="Logged today"
          icon={<PrecisionManufacturingOutlinedIcon />}
          tone="blue"
        />
        <MetricsCard
          title="Operator Utilization"
          value={formatPercent(data.metrics.operatorUtilizationRate)}
          subtitle="Live labor efficiency"
          icon={<EngineeringOutlinedIcon />}
          tone="cyan"
        />
      </section>

      <TopPerformersSection topPerformers={data.topPerformers} />

      <section className="dashboard-two-column">
        <RevenueChart title="Revenue by Customer" data={data.revenueBreakdown.byCustomer} />
        <ActivityFeed items={data.activityFeed} />
      </section>

      <section className="dashboard-two-column">
        <RevenueChart title="Revenue by Operator" data={data.revenueBreakdown.byOperator} />
        <JobTimeline
          title="Monthly Performance"
          subtitle="Revenue and completed jobs over the last three months"
          data={data.monthlyTrend}
          xKey="label"
          yKeys={[
            { key: "revenue", label: "Revenue", color: "#22d3ee" },
            { key: "jobsCompleted", label: "Jobs Completed", color: "#a78bfa" },
          ]}
          variant="line"
        />
      </section>
    </div>
  );
};

export default AdminDashboard;
