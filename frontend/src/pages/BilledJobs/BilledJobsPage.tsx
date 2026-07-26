import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import OperatorJobListPage from "../Operator/OperatorJobListPage";
import QualityControlPage from "../QC/QualityControlPage";
import ProgrammerDashboardPage from "../Programmer/ProgrammerDashboardPage";
import "../RoleBoard.css";
import "./BilledJobs.css";

const BilledJobsPage = () => {
  const [activeTab, setActiveTab] = useState<"PROGRAMMER" | "OPERATOR" | "QC">("PROGRAMMER");

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/billed-jobs" />
      <div className="roleboard-content billed-jobs-content">
        <Header title="Billed Jobs" />
        <div className="roleboard-body billed-jobs-panel">
          <div className="billed-jobs-tabs">
            <button
              type="button"
              className={`billed-jobs-tab ${activeTab === "PROGRAMMER" ? "active" : ""}`}
              onClick={() => setActiveTab("PROGRAMMER")}
            >
              Programmer
            </button>
            <button
              type="button"
              className={`billed-jobs-tab ${activeTab === "OPERATOR" ? "active" : ""}`}
              onClick={() => setActiveTab("OPERATOR")}
            >
              Operator
            </button>
            <button
              type="button"
              className={`billed-jobs-tab ${activeTab === "QC" ? "active" : ""}`}
              onClick={() => setActiveTab("QC")}
            >
              QC
            </button>
          </div>
          <div className="billed-jobs-view">
            {activeTab === "PROGRAMMER" && (
              <ProgrammerDashboardPage forceTab="jobs" hideLayout={true} mode="billed" />
            )}
            {activeTab === "OPERATOR" && (
              <OperatorJobListPage forceTab="logged_jobs" hideLayout={true} isBilled={true} />
            )}
            {activeTab === "QC" && (
              <QualityControlPage forceTab="LOGGED" hideLayout={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BilledJobsPage;
