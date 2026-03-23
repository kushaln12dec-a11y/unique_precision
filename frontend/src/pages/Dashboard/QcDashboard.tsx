import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import type { DashboardQcData } from "../../types/dashboard";
import JobTimeline from "./components/JobTimeline";
import MetricsCard from "./components/MetricsCard";
import RevenueChart from "./components/RevenueChart";
import { formatPercent, formatStatusLabel } from "./utils/metricsCalculator";

type QcDashboardProps = {
  data: DashboardQcData;
};

const QcDashboard = ({ data }: QcDashboardProps) => {
  const rejectionChartData = data.rejectionReasons.map((item) => ({
    name: item.name,
    value: item.value,
  }));

  return (
    <div className="dashboard-view-stack">
      <section className="dashboard-metrics-grid">
        <MetricsCard
          title="Pending QC"
          value={String(data.queueMetrics.jobsPendingQc)}
          numericValue={data.queueMetrics.jobsPendingQc}
          subtitle="Jobs waiting in inspection queue"
          icon={<ChecklistOutlinedIcon />}
          tone="cyan"
        />
        <MetricsCard
          title="Inspected This Month"
          value={String(data.queueMetrics.jobsInspectedThisMonth)}
          numericValue={data.queueMetrics.jobsInspectedThisMonth}
          subtitle="Inspection throughput"
          icon={<PublishedWithChangesOutlinedIcon />}
          tone="violet"
        />
        <MetricsCard
          title="Approval Rate"
          value={formatPercent(data.queueMetrics.approvalRate)}
          subtitle="Pass percentage"
          icon={<GppGoodOutlinedIcon />}
          tone="blue"
        />
        <MetricsCard
          title="Rejection Rate"
          value={formatPercent(data.queueMetrics.rejectionRate)}
          subtitle="Jobs sent back"
          icon={<ReportProblemOutlinedIcon />}
          tone="pink"
        />
      </section>

      <section className="dashboard-two-column">
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Inspection Summary</span>
              <h3>Today’s review state</h3>
            </div>
          </div>
          <div className="dashboard-mini-grid">
            <div className="dashboard-mini-card">
              <strong>{data.inspectionSummary.approvedToday}</strong>
              <span>Approved Today</span>
            </div>
            <div className="dashboard-mini-card">
              <strong>{data.inspectionSummary.rejectedToday}</strong>
              <span>Rejected Today</span>
            </div>
            <div className="dashboard-mini-card">
              <strong>{data.inspectionSummary.pendingReview}</strong>
              <span>Pending Review</span>
            </div>
          </div>
          <div className="dashboard-score-meta">
            <span>Inspector approval rate</span>
            <strong>{formatPercent(data.inspectorPerformance.approvalRate)}</strong>
          </div>
          <p className="dashboard-score-note">
            {data.inspectorPerformance.inspectorName} is running at {data.inspectorPerformance.inspectionRate.toFixed(2)} jobs / hour.
          </p>
        </article>

        <RevenueChart title="Rejection Reasons" data={rejectionChartData} />
      </section>

      <section className="dashboard-two-column">
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Jobs Requiring Review</span>
              <h3>Queue details</h3>
            </div>
          </div>
          <div className="dashboard-list-stack">
            {data.jobsRequiringReview.length === 0 ? (
              <div className="dashboard-empty-state">No jobs are waiting in QC right now.</div>
            ) : (
              data.jobsRequiringReview.map((job) => (
                <div key={job.id} className="dashboard-list-row-card">
                  <div>
                    <strong>{job.refNumber || "-"}</strong>
                    <span>{job.operator} / {job.programmer}</span>
                    <p>{job.issueType}</p>
                  </div>
                  <div className="dashboard-list-meta">
                    <strong>{job.timeInQueueHours.toFixed(1)}h</strong>
                    <small>{formatStatusLabel(job.status)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <JobTimeline
          title="Monthly Inspection Trends"
          subtitle="Approval, rejection, and inspection volume over the last three months"
          data={data.monthlyTrends}
          xKey="label"
          yKeys={[
            { key: "approvalRate", label: "Approval Rate", color: "#22d3ee" },
            { key: "rejectionRate", label: "Rejection Rate", color: "#fb7185" },
            { key: "inspectionVolume", label: "Inspection Volume", color: "#a78bfa" },
          ]}
          variant="line"
        />
      </section>

      <article className="dashboard-glow-card dashboard-detail-card">
        <div className="dashboard-section-head compact">
          <div>
            <span className="dashboard-section-eyebrow">Critical Jobs</span>
            <h3>Problem jobs worth immediate attention</h3>
          </div>
        </div>
        <div className="dashboard-list-stack">
          {data.criticalJobs.length === 0 ? (
            <div className="dashboard-empty-state">No critical jobs are currently highlighted.</div>
          ) : (
            data.criticalJobs.map((job) => (
              <div key={job.id} className="dashboard-list-row-card">
                <div>
                  <strong>{job.refNumber || "-"}</strong>
                  <span>{job.customer}</span>
                  <p>{job.priority}</p>
                </div>
                <div className="dashboard-list-meta">
                  <strong>{formatStatusLabel(job.status)}</strong>
                  <small>{job.timeInQueueHours.toFixed(1)}h in queue</small>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
};

export default QcDashboard;
