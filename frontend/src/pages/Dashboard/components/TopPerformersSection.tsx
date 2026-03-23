import PerformanceCard from "./PerformanceCard";
import type { DashboardAdminData } from "../../../types/dashboard";

type TopPerformersSectionProps = {
  topPerformers: DashboardAdminData["topPerformers"];
};

const TopPerformersSection = ({ topPerformers }: TopPerformersSectionProps) => {
  return (
    <section className="dashboard-section-stack">
      <div className="dashboard-section-head">
        <div>
          <span className="dashboard-section-eyebrow">Top Performers</span>
          <h3>Best movers across the shop floor</h3>
        </div>
      </div>
      <div className="dashboard-performer-grid">
        <PerformanceCard title="Best Operator" performer={topPerformers.operator} />
        <PerformanceCard title="Top Programmer" performer={topPerformers.programmer} />
        <PerformanceCard title="Best QC Inspector" performer={topPerformers.qc} />
      </div>
    </section>
  );
};

export default TopPerformersSection;
