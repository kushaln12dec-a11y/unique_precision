import type { ElementType } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CodeIcon from "@mui/icons-material/Code";
import BuildIcon from "@mui/icons-material/Build";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon: ElementType;
}

export const BREADCRUMB_MAP: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Dashboard", path: "/dashboard", icon: DashboardIcon }],
  "/operator-dashboard": [{ label: "Operator Dashboard", path: "/operator-dashboard", icon: BuildIcon }],
  "/programmer": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Programmer", path: "/programmer", icon: CodeIcon },
  ],
  "/programmer/newjob": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Programmer", path: "/programmer", icon: CodeIcon },
    { label: "New Job", path: "/programmer/newjob", icon: AddCircleOutlineIcon },
  ],
  "/programmer/clone": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Programmer", path: "/programmer", icon: CodeIcon },
    { label: "Clone Job", path: "/programmer/clone", icon: AddCircleOutlineIcon },
  ],
  "/operator": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Operator", path: "/operator", icon: BuildIcon },
  ],
  "/operator/viewpage": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Operator", path: "/operator", icon: BuildIcon },
    { label: "Job Details", path: "/operator/viewpage", icon: BuildIcon },
  ],
  "/qc": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "QC", path: "/qc", icon: VerifiedUserIcon },
  ],
  "/qc/inspection-report": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "QC", path: "/qc", icon: VerifiedUserIcon },
    { label: "Inspection Report", path: "/qc/inspection-report", icon: VerifiedUserIcon },
  ],
  "/inventory": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Inventory", path: "/inventory", icon: InventoryIcon },
  ],
  "/users": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "User Management", path: "/users", icon: PeopleIcon },
  ],
  "/jobLogs": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Job Logs", path: "/jobLogs", icon: PeopleIcon },
  ],
  "/admin-console": [
    { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
    { label: "Admin Console", path: "/admin-console", icon: SettingsSuggestIcon },
  ],
};

export const resolveHeaderBreadcrumbs = ({
  breadcrumbsOverride,
  pathname,
  title,
}: {
  breadcrumbsOverride?: BreadcrumbItem[];
  pathname: string;
  title: string;
}): BreadcrumbItem[] => {
  if (breadcrumbsOverride?.length) return breadcrumbsOverride;
  if (BREADCRUMB_MAP[pathname]) return BREADCRUMB_MAP[pathname];

  if (pathname.match(/^\/programmer\/edit\/[^/]+$/)) {
    return [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "Programmer", path: "/programmer", icon: CodeIcon },
      { label: "Edit Job", path: pathname, icon: AddCircleOutlineIcon },
    ];
  }

  if (pathname.match(/^\/programmer\/clone\/[^/]+$/)) {
    return [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "Programmer", path: "/programmer", icon: CodeIcon },
      { label: "Clone Job", path: pathname, icon: AddCircleOutlineIcon },
    ];
  }

  return title
    ? [{ label: title, path: pathname, icon: DashboardIcon }]
    : BREADCRUMB_MAP["/dashboard"];
};
