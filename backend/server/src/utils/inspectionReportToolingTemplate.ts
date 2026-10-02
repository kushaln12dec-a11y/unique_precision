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
  samples?: string[];
  instruments?: InstrumentSelection | string[];
};

type ToolingSpareInspectionPayload = {
  quantityCount?: number;
  customerId?: string;
  date?: string;
  drawingName?: string;
  drawingNo?: string;
  toolIdentificationNo?: string;
  consumablePartIdentificationNo?: string;
  consumablePartName?: string;
  quantity?: string;
  hrc?: string;
  material?: string;
  decision?: "ACCEPTED" | "REJECTED" | "PENDING";
  rows?: InspectionRowPayload[];
  remarks?: string;
  inspectedBy?: string;
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
    path.resolve(process.cwd(), "../frontend/dist/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "frontend/public/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "frontend/dist/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "public/output-onlinepngtools.svg"),
    path.resolve(process.cwd(), "dist/output-onlinepngtools.svg"),
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

const renderBodyRows = (rows: InspectionRowPayload[] = [], numSamples: number) => {
  const safeRows = rows.length > 0 ? rows : [{}];
  const sampleIndices = Array.from({ length: numSamples }, (_, i) => i);
  return safeRows
    .map((row, index) => {
      const nominal = asNumberText(row.actualDimension);
      const tolerance = normalizeText(row.tolerance);
      const samplesText = sampleIndices
        .map((i) => asNumberText(row.samples?.[i] || ""))
        .map((s) => `<td class="center">${htmlEscape(s)}</td>`)
        .join("");

      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td class="center">DISTANCE</td>
          <td class="center">${htmlEscape(nominal)}</td>
          <td class="center">${htmlEscape(tolerance || "-")}</td>
          <td class="center">H.M</td>
          ${samplesText}
          <td class="center"><strong>OK</strong></td>
          <td>${index === 0 ? "AS PER DRAWING" : ""}</td>
        </tr>
      `;
    })
    .join("");
};

export const buildToolingSpareInspectionReportHtml = (payload: ToolingSpareInspectionPayload): string => {
  const logoDataUri = getLogoDataUri();
  const numSamples = Math.max(1, payload.quantityCount || 1);
  const sampleIndices = Array.from({ length: numSamples }, (_, i) => i);
  const receivedQty = Number(payload.quantity || 0);
  const bodyRows = renderBodyRows(payload.rows || [], numSamples);
  const formattedDate = normalizeText(payload.date) || "";
  const partNo = normalizeText(payload.drawingNo) || normalizeText(payload.toolIdentificationNo) || "-";
  const partName = normalizeText(payload.drawingName) || normalizeText(payload.consumablePartName) || "-";
  const supplierName = normalizeText(payload.customerId) || "Unique Precision";
  const hrc = normalizeText(payload.hrc) || "-";
  const material = normalizeText(payload.material) || "-";
  const remarks = normalizeText(payload.remarks) || "";
  const inspectedByName = normalizeText(payload.inspectedBy) || "-";
  const approvedByName = normalizeText(payload.approvedBy) || "-";
  const totalCols = 5 + numSamples + 2; // Sl + Parameter + Nominal + Tolerance + Method + Samples + Result + Remarks

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tooling Spare Inspection Report</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; font-size: 13px; }
    .sheet { width: 100%; border: 2px solid #111827; display: flex; flex-direction: column; min-height: 710px; }
    
    /* ---- Header row ---- */
    .header-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .header-table td { border: 1px solid #111827; padding: 0; vertical-align: middle; }
    .header-logo-cell {
      width: 22%;
      text-align: center;
      padding: 6px 8px;
    }
    .header-logo-cell img { width: 28px; height: 28px; vertical-align: middle; margin-right: 6px; }
    .header-logo-cell span { font-weight: 700; font-size: 14px; vertical-align: middle; }
    .header-title-cell {
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.3px;
      padding: 8px 4px;
    }
    .header-date-cell {
      width: 18%;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      padding: 8px 4px;
    }

    /* ---- Meta rows ---- */
    .meta-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .meta-table td { border: 1px solid #111827; padding: 6px 10px; font-size: 13px; font-weight: 600; vertical-align: middle; }
    .meta-table td strong { font-weight: 800; }

    /* ---- Report table ---- */
    .report-table { border-collapse: collapse; width: 100%; table-layout: fixed; flex: 1; }
    .report-table td, .report-table th { border: 1px solid #111827; padding: 5px 4px; vertical-align: middle; }
    .head th {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 11.5px;
      line-height: 1.25;
      text-align: center;
      white-space: normal;
      word-break: keep-all;
    }
    .center { text-align: center; }
    .body-row td { font-size: 13px; line-height: 1.25; }

    /* ---- Signature row ---- */
    .sig-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .sig-table td { border: 1px solid #111827; padding: 10px 14px; vertical-align: bottom; font-size: 13px; }
    .sig-label { font-weight: 800; font-size: 12px; line-height: 1.35; }
    .sig-name { font-weight: 700; font-size: 14px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td class="header-logo-cell">
          ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" />` : ""}
          <span>Unique Precision</span>
        </td>
        <td class="header-title-cell">Tooling Spare Inspection Report</td>
        <td class="header-date-cell">${htmlEscape(formattedDate)}</td>
      </tr>
    </table>

    <!-- Metadata -->
    <table class="meta-table">
      <tr>
        <td style="width:50%;"><strong>Part No :</strong>&nbsp;&nbsp;${htmlEscape(partNo)}</td>
        <td style="width:20%;"><strong>Supplier Name :</strong></td>
        <td style="width:30%;">${htmlEscape(supplierName)}</td>
      </tr>
      <tr>
        <td><strong>Part Name :</strong>&nbsp;&nbsp;${htmlEscape(partName)}</td>
        <td><strong>Received Qty :</strong></td>
        <td>${Number.isFinite(receivedQty) && receivedQty > 0 ? Math.round(receivedQty) : "-"}</td>
      </tr>
      <tr>
        <td><strong>HRC :</strong>&nbsp;&nbsp;${htmlEscape(hrc)}</td>
        <td><strong>Material :</strong></td>
        <td>${htmlEscape(material)}</td>
      </tr>
    </table>

    <!-- Data Table -->
    <table class="report-table">
      <tr class="head">
        <th style="width:5%;">Sl.No.</th>
        <th style="width:12%;">Parameter</th>
        <th style="width:11%;">Specification<br/>Nominal</th>
        <th style="width:10%;">Specification<br/>Tolerance</th>
        <th style="width:10%;">Inspection<br/>Method</th>
        ${sampleIndices.map((i) => `<th style="width:${Math.max(6, 25 / numSamples)}%;">Sample ${i + 1}</th>`).join("")}
        <th style="width:9%;">Result<br/>OK / Not</th>
        <th style="width:13%;">Remarks</th>
      </tr>
      ${bodyRows.replace(/<tr>/g, '<tr class="body-row">')}
      <tr>
        <td colspan="${totalCols}" style="height: 60px;"></td>
      </tr>
    </table>

    <!-- Signature Row -->
    <table class="sig-table">
      <tr>
        <td style="width: 20%;">
          <div class="sig-label">Inspected By<br/>Name &amp; Signature</div>
        </td>
        <td style="width: 15%;"></td>
        <td style="width: 15%;"><span class="sig-name">${htmlEscape(inspectedByName)}</span></td>
        <td style="width: 20%;">
          <div class="sig-label">Approved By<br/>Name &amp; Signature</div>
        </td>
        <td style="width: 15%;"></td>
        <td style="width: 15%;"><span class="sig-name">${htmlEscape(approvedByName)}</span></td>
      </tr>
    </table>
  </div>
</body>
</html>`;
};
