import React from "react";

type Props = {
  activeTab: "jobs" | "logs" | "logged_jobs";
  setActiveTab: React.Dispatch<React.SetStateAction<"jobs" | "logs" | "logged_jobs">>;
};

export const OperatorTabs: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="operator-subtabs">
      <button type="button" className={`operator-subtab ${activeTab === "jobs" ? "active" : ""}`} onClick={() => setActiveTab("jobs")}>
        Jobs
      </button>
      <button type="button" className={`operator-subtab ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
        Logs
      </button>
      <button type="button" className={`operator-subtab ${activeTab === "logged_jobs" ? "active" : ""}`} onClick={() => setActiveTab("logged_jobs")}>
        Closed Jobs
      </button>
    </div>
  );
};

export default OperatorTabs;
