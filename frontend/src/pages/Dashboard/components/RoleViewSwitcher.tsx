import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import type { ElementType } from "react";
import type { DashboardRoleView } from "../../../types/dashboard";

type RoleViewSwitcherProps = {
  activeView: DashboardRoleView;
  allowedViews: DashboardRoleView[];
  onChange: (view: DashboardRoleView) => void;
};

const viewConfig: Record<
  DashboardRoleView,
  { label: string; icon: ElementType; accent: string }
> = {
  ADMIN: { label: "Admin View", icon: DashboardCustomizeOutlinedIcon, accent: "cyan" },
  OPERATOR: { label: "Operator View", icon: PrecisionManufacturingOutlinedIcon, accent: "blue" },
  PROGRAMMER: { label: "Programmer View", icon: CodeOutlinedIcon, accent: "violet" },
  QC: { label: "QC View", icon: FactCheckOutlinedIcon, accent: "pink" },
};

const RoleViewSwitcher = ({
  activeView,
  allowedViews,
  onChange,
}: RoleViewSwitcherProps) => {
  return (
    <div className="dashboard-role-switcher">
      {allowedViews.map((view) => {
        const config = viewConfig[view];
        const Icon = config.icon;
        const isActive = activeView === view;
        return (
          <button
            key={view}
            type="button"
            className={`dashboard-role-switch ${isActive ? "active" : ""} accent-${config.accent}`}
            onClick={() => onChange(view)}
          >
            <Icon />
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RoleViewSwitcher;
