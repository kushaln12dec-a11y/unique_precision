import React from "react";

type Props = {
  activeTab: "jobs" | "logs";
  setActiveTab: React.Dispatch<React.SetStateAction<"jobs" | "logs">>;
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
    </div>
  );
};

export default OperatorTabs;
