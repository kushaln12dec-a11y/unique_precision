import { apiUrl } from "./apiClient";

export type InstrumentSelection = {
  hm: boolean;
  sg: boolean;
  pg: boolean;
  vc: boolean;
  dm: boolean;
};

export type InspectionReportRowPayload = {
  actualDimension: string;
  tolerance: string;
  measuringDimension: string;
  deviation: string;
  instruments: InstrumentSelection;
};

export type InspectionReportPayload = {
  groupId?: number;
  customerId: string;
  date: string;
  drawingName: string;
  drawingNo: string;
  quantity: string;
  decision: "ACCEPTED" | "REJECTED" | "PENDING";
  rows: InspectionReportRowPayload[];
  remarks: string;
  workPieceDamage: "YES" | "NO" | "";
  rightAngleProblem: "YES" | "NO" | "";
  materialProblem: "YES" | "NO" | "";
  inspectedBy: string;
  approvedBy: string;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const generateInspectionReport = async (payload: InspectionReportPayload): Promise<Blob> => {
  const res = await fetch(apiUrl("/api/inspection-reports/generate"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to generate inspection report");
  }

  return res.blob();
};

export const getInspectionReportPreviewHtml = async (payload: InspectionReportPayload): Promise<string> => {
  const res = await fetch(apiUrl("/api/inspection-reports/preview-html"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load inspection report preview");
  }

  const body = (await res.json()) as { html?: string };
  return body.html || "";
};
