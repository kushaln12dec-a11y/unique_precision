import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import type { DashboardProgrammerData } from "../../types/dashboard";
import JobStatusBreakdown from "./components/JobStatusBreakdown";
import MetricsCard from "./components/MetricsCard";
import RevenueChart from "./components/RevenueChart";
import { formatCurrency, formatDateTime, formatPercent, formatStatusLabel } from "./utils/metricsCalculator";

type ProgrammerDashboardProps = {
  data: DashboardProgrammerData;
};

const ProgrammerDashboard = ({ data }: ProgrammerDashboardProps) => {
  return (
    <div className="dashboard-view-stack">
      <section className="dashboard-metrics-grid">
        <MetricsCard
          title="Created Today"
          value={String(data.summary.jobsCreatedToday)}
          numericValue={data.summary.jobsCreatedToday}
          subtitle={`${data.summary.jobsCreatedThisMonth} this month`}
          icon={<AssignmentOutlinedIcon />}
          tone="cyan"
        />
        <MetricsCard
          title="Currently Active"
          value={String(data.summary.jobsCurrentlyActive)}
          numericValue={data.summary.jobsCurrentlyActive}
          subtitle="Awaiting operator / in motion"
          icon={<EngineeringOutlinedIcon />}
          tone="blue"
        />
        <MetricsCard
          title="Completed"
          value={String(data.summary.jobsCompleted)}
          numericValue={data.summary.jobsCompleted}
          subtitle="QC approved jobs"
          icon={<DoneAllOutlinedIcon />}
          tone="violet"
        />
        <MetricsCard
          title="QC Issues"
          value={String(data.summary.jobsWithIssues)}
          numericValue={data.summary.jobsWithIssues}
          subtitle="Rejected or flagged"
          icon={<ErrorOutlineOutlinedIcon />}
          tone="pink"
        />
      </section>

      <section className="dashboard-two-column">
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Recent Jobs</span>
              <h3>My latest created jobs</h3>
            </div>
          </div>
          <div className="dashboard-list-stack">
            {data.recentJobs.length === 0 ? (
              <div className="dashboard-empty-state">No programmer jobs found.</div>
            ) : (
              data.recentJobs.map((job) => (
                <div key={job.id} className="dashboard-list-row-card">
                  <div>
                    <strong>{job.refNumber || "-"}</strong>
                    <span>{job.customer}</span>
                    <p>{formatDateTime(job.createdAt)}</p>
                  </div>
                  <div className="dashboard-list-meta">
                    <strong>{formatCurrency(job.totalAmount)}</strong>
                    <small>{formatStatusLabel(job.status)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Quality Score</span>
              <h3>Clean completion rate</h3>
            </div>
          </div>
          <div className="dashboard-score-orb">
            <strong>{formatPercent(data.qualityScore.score)}</strong>
            <span>without QC rejection</span>
          </div>
          <div className="dashboard-score-meta">
            <span>Team average</span>
            <strong>{formatPercent(data.qualityScore.teamAverage)}</strong>
          </div>
          <p className="dashboard-score-note">
            {data.qualityScore.trend === "up"
              ? "You’re outperforming the team average."
              : "A few cleaner handoffs will pull this back above team average."}
          </p>
        </article>
      </section>

      <section className="dashboard-two-column">
        <JobStatusBreakdown title="Job Distribution" data={data.statusBreakdown} />
        <RevenueChart title="Customer Jobs Breakdown" data={data.customerBreakdown} />
      </section>

      <section className="dashboard-two-column">
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">QC Feedback</span>
              <h3>Recent rejection notes</h3>
            </div>
          </div>
          <div className="dashboard-list-stack">
            {data.qcFeedback.length === 0 ? (
              <div className="dashboard-empty-state">No recent QC rejections. Nice work.</div>
            ) : (
              data.qcFeedback.map((feedback) => (
                <div key={feedback.id} className="dashboard-list-row-card">
                  <div>
                    <strong>{feedback.refNumber || "-"}</strong>
                    <span>{feedback.customer}</span>
                    <p>{feedback.feedback}</p>
                  </div>
                  <div className="dashboard-list-meta">
                    <small>{feedback.reason}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Revenue Impact</span>
              <h3>Value of jobs created</h3>
            </div>
          </div>
          <div className="dashboard-stat-list">
            <div>
              <span>Total Revenue</span>
              <strong>{formatCurrency(data.revenueImpact.totalRevenue)}</strong>
            </div>
            <div>
              <span>Average Job Value</span>
              <strong>{formatCurrency(data.revenueImpact.averageJobValue)}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default ProgrammerDashboard;
