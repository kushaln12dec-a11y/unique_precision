import React from "react";

type Props = {
  activeTab: "jobs" | "logs";
  setActiveTab: React.Dispatch<React.SetStateAction<"jobs" | "logs">>;
};

export const ProgrammerTabs: React.FC<Props> = ({ activeTab, setActiveTab }) => (
  <div className="programmer-subtabs">
    <button type="button" className={`programmer-subtab ${activeTab === "jobs" ? "active" : ""}`} onClick={() => setActiveTab("jobs")}>
      Jobs
    </button>
    <button type="button" className={`programmer-subtab ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
      Logs
    </button>
  </div>
);

export default ProgrammerTabs;
