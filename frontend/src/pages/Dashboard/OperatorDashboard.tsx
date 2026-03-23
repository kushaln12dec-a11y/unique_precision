import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import type { DashboardOperatorData } from "../../types/dashboard";
import JobTimeline from "./components/JobTimeline";
import MetricsCard from "./components/MetricsCard";
import { formatCurrency, formatDateTime, formatHours, formatPercent, formatStatusLabel } from "./utils/metricsCalculator";

type OperatorDashboardProps = {
  data: DashboardOperatorData;
  onOpenOperatorJob?: (groupId: string) => void;
};

const OperatorDashboard = ({ data, onOpenOperatorJob }: OperatorDashboardProps) => {
  return (
    <div className="dashboard-view-stack">
      <section className="dashboard-hero-panel operator">
        <div className="dashboard-hero-copy">
          <span className="dashboard-section-eyebrow">Operator Performance</span>
          <h2>{data.profile.name}</h2>
          <p>{data.profile.motivationalMessage}</p>
          <div className="dashboard-progress-panel">
            <div className="dashboard-progress-head">
              <strong>Target vs Actual</strong>
              <span>{formatPercent(data.profile.completionPercent)}</span>
            </div>
            <div className="dashboard-progress-track">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${Math.min(100, data.profile.completionPercent)}%` }}
              />
            </div>
            <small>
              {formatCurrency(data.profile.todayRevenue)} / {formatCurrency(data.profile.targetRevenue)}
            </small>
          </div>
        </div>
        <div className="dashboard-hero-grid">
          <MetricsCard
            title="Today's Revenue"
            value={formatCurrency(data.profile.todayRevenue)}
            subtitle={data.profile.badge}
            icon={<PaidOutlinedIcon />}
            tone="cyan"
          />
          <MetricsCard
            title="Machine Hours"
            value={formatHours(data.profile.machineHoursToday)}
            subtitle={`Current machine ${data.profile.currentMachine}`}
            icon={<PrecisionManufacturingOutlinedIcon />}
            tone="blue"
          />
          <MetricsCard
            title="Jobs Completed"
            value={String(data.profile.jobsCompletedToday)}
            numericValue={data.profile.jobsCompletedToday}
            subtitle="Today"
            icon={<AssignmentTurnedInOutlinedIcon />}
            tone="violet"
          />
          <MetricsCard
            title="Current Machine"
            value={data.profile.currentMachine}
            subtitle="Live assignment"
            icon={<TimerOutlinedIcon />}
            tone="pink"
          />
        </div>
      </section>

      <section className="dashboard-two-column">
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Current Job</span>
              <h3>Live production card</h3>
            </div>
          </div>
          {data.currentJob ? (
            <div className="dashboard-stat-list">
              <div><span>Job Ref</span><strong>{data.currentJob.refNumber || "-"}</strong></div>
              <div><span>Customer</span><strong>{data.currentJob.customer || "-"}</strong></div>
              <div><span>Machine</span><strong>{data.currentJob.machineNumber}</strong></div>
              <div><span>Started</span><strong>{formatDateTime(data.currentJob.startedAt)}</strong></div>
              <div><span>ETA</span><strong>{formatDateTime(data.currentJob.estimatedCompletionAt)}</strong></div>
              <div><span>Counter</span><strong>{formatHours(data.currentJob.realTimeHoursSeed)}</strong></div>
              <div className="dashboard-action-row">
                <button type="button" className="dashboard-chip-button" onClick={() => onOpenOperatorJob?.(data.currentJob!.groupId)}>Resume</button>
                <button type="button" className="dashboard-chip-button" onClick={() => onOpenOperatorJob?.(data.currentJob!.groupId)}>Open Job</button>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty-state">No machine is currently running under this operator.</div>
          )}
        </article>

        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Today's Schedule</span>
              <h3>Assigned jobs</h3>
            </div>
          </div>
          <div className="dashboard-list-stack">
            {data.schedule.length === 0 ? (
              <div className="dashboard-empty-state">No assigned jobs found for today.</div>
            ) : (
              data.schedule.map((job) => (
                <div key={job.id} className="dashboard-list-row-card">
                  <div>
                    <strong>{job.refNumber || "-"}</strong>
                    <span>{job.customer}</span>
                    <p>{job.cutDetails}</p>
                  </div>
                  <div className="dashboard-list-meta">
                    <span>{job.machineNumber}</span>
                    <strong>{formatHours(job.estimatedHours)}</strong>
                    <small>{formatStatusLabel(job.status)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-two-column">
        <JobTimeline
          title="Production Graph"
          subtitle="Hours worked and revenue earned over the last eight hours"
          data={data.productionSeries}
          xKey="label"
          yKeys={[
            { key: "hours", label: "Hours", color: "#22d3ee" },
            { key: "revenue", label: "Revenue", color: "#f472b6" },
          ]}
          variant="area"
        />
        <article className="dashboard-glow-card dashboard-detail-card">
          <div className="dashboard-section-head compact">
            <div>
              <span className="dashboard-section-eyebrow">Machine + QC</span>
              <h3>Shop floor status</h3>
            </div>
          </div>
          <div className="dashboard-mini-grid">
            {data.machineStatus.map((machine) => (
              <div key={machine.machineNumber} className="dashboard-mini-card">
                <strong>{machine.machineNumber}</strong>
                <span>{formatStatusLabel(machine.status)}</span>
                <small>Uptime {formatPercent(machine.uptimePercent)}</small>
              </div>
            ))}
          </div>
          <div className="dashboard-list-stack compact">
            {data.qcStatus.map((item) => (
              <div key={item.id} className="dashboard-list-row-card">
                <div>
                  <strong>{item.refNumber || "-"}</strong>
                  <span>{item.customer}</span>
                </div>
                <div className="dashboard-list-meta">
                  <strong>{formatStatusLabel(item.status)}</strong>
                  <small>{item.rejectionReason || "Awaiting QC outcome"}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default OperatorDashboard;
