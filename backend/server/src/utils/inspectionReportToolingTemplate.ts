import fs from "fs";
import path from "path";

type InstrumentSelection = {
  hm?: boolean;
  sg?: boolean;
  pg?: boolean;
  vc?: boolean;
  dm?: boolean;
};

type InspectionRowPayload = {
  actualDimension?: string;
  tolerance?: string;
  measuringDimension?: string;
  deviation?: string;
  instruments?: InstrumentSelection | string[];
};

type ToolingSpareInspectionPayload = {
  customerId?: string;
  date?: string;
  drawingName?: string;
  drawingNo?: string;
  toolIdentificationNo?: string;
  consumablePartIdentificationNo?: string;
  consumablePartName?: string;
  quantity?: string;
  decision?: "ACCEPTED" | "REJECTED" | "PENDING";
  rows?: InspectionRowPayload[];
  remarks?: string;
  approvedBy?: string;
};

const htmlEscape = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value: unknown): string => String(value ?? "").replace(/\s+/g, " ").trim();

const asNumberText = (value: unknown): string => {
  const raw = normalizeText(value);
  if (!raw) return "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed.toFixed(3).replace(/\.?0+$/, "") : raw;
};

const formatDecision = (decision?: string): string => {
  const normalized = String(decision || "").toUpperCase();
  if (normalized === "ACCEPTED") return "OK";
  if (normalized === "REJECTED") return "NOT OK";
  return "PENDING";
};

let cachedLogoDataUri: string | null = null;

const resolveLogoPath = (): string | null => {
  const candidates = [
    path.resolve(process.cwd(), "../frontend/public/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "frontend/public/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "public/output-onlinepngtools.svg"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const getLogoDataUri = (): string => {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const logoPath = resolveLogoPath();
  if (!logoPath) return "";
  const svgRaw = fs.readFileSync(logoPath, "utf8");
  cachedLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgRaw, "utf8").toString("base64")}`;
  return cachedLogoDataUri;
};

const renderBodyRows = (rows: InspectionRowPayload[] = []) => {
  const safeRows = rows.length > 0 ? rows : [{}];
  return safeRows
    .map((row, index) => {
      const nominal = asNumberText(row.actualDimension);
      const tolerance = normalizeText(row.tolerance);
      const sample1 = asNumberText(row.measuringDimension);
      const sample2 = asNumberText(row.deviation);
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>DISTANCE</td>
          <td class="center">${htmlEscape(nominal)}</td>
          <td class="center">${htmlEscape(tolerance || "-")}</td>
          <td class="center">H.M</td>
          <td class="center">${htmlEscape(sample1)}</td>
          <td class="center">${htmlEscape(sample2)}</td>
          <td class="center"><strong>OK</strong></td>
          <td>${index === 0 ? "AS PER DRAWING" : ""}</td>
        </tr>
      `;
    })
    .join("");
};

export const buildToolingSpareInspectionReportHtml = (payload: ToolingSpareInspectionPayload): string => {
  const logoDataUri = getLogoDataUri();
  const receivedQty = Number(payload.quantity || 0);
  const acceptedQty = Number.isFinite(receivedQty) && receivedQty > 0 ? Math.max(1, Math.round(receivedQty)) : 1;
  const bodyRows = renderBodyRows(payload.rows || []);
  const formattedDate = normalizeText(payload.date) || "";
  const drawingNo = normalizeText(payload.drawingNo) || "-";
  const drawingName = normalizeText(payload.drawingName) || "-";
  const toolIdentificationNo = normalizeText(payload.toolIdentificationNo) || drawingNo;
  const consumablePartIdentificationNo = normalizeText(payload.consumablePartIdentificationNo) || drawingNo;
  const consumablePartName = normalizeText(payload.consumablePartName) || drawingName;
  const supplierName = normalizeText(payload.customerId) || "-";
  const remarks = normalizeText(payload.remarks) || "-";
  const resultLabel = formatDecision(payload.decision);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Inspection Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; }
    .sheet { width: 100%; border: 1px solid #1f2937; }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 10px 6px;
      border-bottom: 1px solid #1f2937;
    }
    .sheet-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      display: ${logoDataUri ? "block" : "none"};
    }
    .sheet-title {
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0.2px;
      line-height: 1;
      text-transform: uppercase;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { border: 1px solid #1f2937; padding: 5px; vertical-align: middle; }
    .meta-table td { min-height: 36px; }
    .meta-date { font-size: 18px; text-align: center; font-weight: 700; letter-spacing: 0.25px; }
    .meta-inline {
      text-align: left;
      font-size: 15px;
      font-weight: 600;
      padding: 8px 12px;
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.25;
    }
    .meta-inline strong { font-weight: 700; }
    .center { text-align: center; }
    .head th {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.2;
      white-space: normal;
      word-break: keep-all;
      text-align: center;
    }
    .sub-head th {
      background: #f9fafb;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
    }
    .body-row td {
      font-size: 13px;
      line-height: 1.2;
    }
    .result { font-size: 18px; text-align: center; font-weight: 700; }
    .remarks { min-height: 28px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="sheet-header">
      ${logoDataUri ? `<img class="sheet-logo" src="${logoDataUri}" alt="Unique Precision Logo" />` : ""}
      <div class="sheet-title">Unique Precision</div>
    </div>
    <table class="meta-table">
      <tr>
        <td class="meta-inline"><strong>Tool Identification No:</strong> ${htmlEscape(toolIdentificationNo)}</td>
        <td class="meta-inline"><strong>Supplier Name:</strong> ${htmlEscape(supplierName)}</td>
        <td class="meta-date">${htmlEscape(formattedDate)}</td>
      </tr>
      <tr>
        <td class="meta-inline"><strong>Consumable Part Identification No:</strong> ${htmlEscape(consumablePartIdentificationNo)}</td>
        <td class="meta-inline"><strong>Received Qty:</strong> ${Number.isFinite(receivedQty) && receivedQty > 0 ? Math.round(receivedQty) : "-"}</td>
        <td class="meta-inline"><strong>Accepted Qty:</strong> ${acceptedQty}</td>
      </tr>
      <tr>
        <td class="meta-inline" colspan="3"><strong>Consumable Part Name:</strong> ${htmlEscape(consumablePartName)}</td>
      </tr>
    </table>
    <table class="report-table">
      <tr class="head">
        <th rowspan="2" style="width:5%;">Sl.No.</th>
        <th rowspan="2" style="width:12%;">Parameter</th>
        <th rowspan="2" style="width:12%;">Specification Nominal</th>
        <th rowspan="2" style="width:11%;">Specification Tolerance</th>
        <th rowspan="2" style="width:12%;">Inspection Method</th>
        <th colspan="2" style="width:16%;">Quantity Inspection Result</th>
        <th rowspan="2" style="width:10%;">Result<br/>OK / Not OK</th>
        <th rowspan="2" style="width:22%;">Remarks</th>
      </tr>
      <tr class="sub-head">
        <th>Quantity 1</th>
        <th>Quantity 2</th>
      </tr>
      ${bodyRows.replace(/<tr>/g, '<tr class="body-row">')}
      <tr>
        <td colspan="8" class="result">${htmlEscape(resultLabel)}</td>
        <td class="remarks">${htmlEscape(remarks)}</td>
      </tr>
      <tr>
        <td colspan="9" style="height:42px; font-weight:700;">Approved By: ${htmlEscape(normalizeText(payload.approvedBy) || "-")}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
};
