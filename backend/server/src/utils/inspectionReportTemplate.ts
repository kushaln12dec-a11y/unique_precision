import fs from "fs";
import path from "path";

export type InstrumentKey = "hm" | "sg" | "pg" | "vc" | "dm";
export type YesNo = "YES" | "NO" | "";

export type InstrumentSelection = Partial<Record<InstrumentKey, boolean>> | InstrumentKey[];

export type InspectionRowPayload = {
  actualDimension?: string;
  tolerance?: string;
  measuringDimension?: string;
  deviation?: string;
  instruments?: InstrumentSelection;
};

export type GenerateInspectionReportPayload = {
  groupId?: bigint | number | string;
  customerId?: string;
  date?: string;
  drawingName?: string;
  drawingNo?: string;
  quantity?: string;
  decision?: "ACCEPTED" | "REJECTED" | "PENDING";
  rows?: InspectionRowPayload[];
  remarks?: string;
  workPieceDamage?: YesNo;
  rightAngleProblem?: YesNo;
  materialProblem?: YesNo;
  inspectedBy?: string;
  approvedBy?: string;
};

const CHECK_MARK = "&#10003;";
const MAX_ROWS = 30;

const htmlEscape = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value: unknown): string => String(value ?? "").replace(/\s+/g, " ").trim();

const formatTolerance = (value: unknown): string => {
  const raw = normalizeText(value);
  if (!raw) return "";
  const escaped = htmlEscape(raw);
  const hasLeadingSign = /^[+\-]/.test(raw);
  const hasPlusMinus = raw.includes("±") || raw.includes("+/-");
  if (hasLeadingSign || hasPlusMinus) return escaped;
  return `&#177; ${escaped}`;
};

const toYesNo = (value: unknown): YesNo => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "YES") return "YES";
  if (normalized === "NO") return "NO";
  return "";
};

const hasRowValue = (row: InspectionRowPayload) => {
  const hasText = Boolean(
    normalizeText(row.actualDimension) ||
      normalizeText(row.tolerance) ||
      normalizeText(row.measuringDimension) ||
      normalizeText(row.deviation)
  );
  const instrument = row.instruments;
  const hasInstrument = Array.isArray(instrument)
    ? instrument.length > 0
    : Boolean(instrument && Object.values(instrument).some(Boolean));
  return hasText || hasInstrument;
};

const instrumentChecked = (source: InstrumentSelection | undefined, key: InstrumentKey): boolean => {
  if (!source) return false;
  if (Array.isArray(source)) return source.includes(key);
  return Boolean(source[key]);
};

const decisionChecked = (
  selected: GenerateInspectionReportPayload["decision"],
  expected: "ACCEPTED" | "REJECTED"
) => (normalizeText(selected).toUpperCase() === expected ? CHECK_MARK : "");

const ynCell = (value: YesNo, expected: YesNo) => (value === expected ? CHECK_MARK : "");

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

const EMAIL_ICON_SVG =
  '<svg class="contact-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.2" y="4.2" width="15.6" height="11.6" rx="1.4"></rect><path d="M3.4 5.2 L10 10.4 L16.6 5.2"></path></svg>';

const PUBLIC_ICON_SVG =
  '<svg class="contact-icon-svg public-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1.01-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.38z"></path></svg>';

const instrumentPack = (source: InstrumentSelection | undefined) => `
  <span class="inst-code">HM</span><span class="inst-box">${instrumentChecked(source, "hm") ? CHECK_MARK : ""}</span>
  <span class="inst-code">SG</span><span class="inst-box">${instrumentChecked(source, "sg") ? CHECK_MARK : ""}</span>
  <span class="inst-code">PG</span><span class="inst-box">${instrumentChecked(source, "pg") ? CHECK_MARK : ""}</span>
  <span class="inst-code">VC</span><span class="inst-box">${instrumentChecked(source, "vc") ? CHECK_MARK : ""}</span>
  <span class="inst-code">DM</span><span class="inst-box">${instrumentChecked(source, "dm") ? CHECK_MARK : ""}</span>
`;

export const buildInspectionReportHtml = (payload: GenerateInspectionReportPayload): string => {
  const logoDataUri = getLogoDataUri();
  const filledRows = Array.isArray(payload.rows) ? payload.rows : [];
  const rows = filledRows.slice(0, MAX_ROWS);
  const rowsToRender = rows.length > 0 ? rows : [{} as InspectionRowPayload];

  const tableRowsHtml = rowsToRender
    .map((row, index) => {
      return `
        <tr>
          <td class="sl-col">${index + 1}</td>
          <td>${htmlEscape(row.actualDimension)}</td>
          <td>${formatTolerance(row.tolerance)}</td>
          <td>${htmlEscape(row.measuringDimension)}</td>
          <td>${htmlEscape(row.deviation)}</td>
          <td class="inst-col-data"><div class="inst-row">${instrumentPack(row.instruments)}</div></td>
        </tr>
      `;
    })
    .join("");

  const workPieceDamage = toYesNo(payload.workPieceDamage);
  const rightAngleProblem = toYesNo(payload.rightAngleProblem);
  const materialProblem = toYesNo(payload.materialProblem);
  const inspectedBy = normalizeText(payload.inspectedBy).toUpperCase();
  const approvedBy = normalizeText(payload.approvedBy).toUpperCase();

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Inspection Report</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #e7e8eb;
      color: #2b47a2;
    }
    .preview-canvas {
      width: 100%;
      min-height: 100vh;
      padding: 12px;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
    }
    .sheet {
      position: relative;
      width: 100%;
      max-width: 760px;
      min-height: 1065px;
      background: #fff;
      border: 1.6px solid #3c55b4;
      padding: 24px 8px 8px;
      color: #2848a7;
    }
    .title-badge {
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      background: #2f4ba8;
      color: #fff;
      border: 1px solid #2f4ba8;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      padding: 3px 14px 2px;
      line-height: 1.1;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0 6px 4px;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-icon {
      width: 46px;
      height: 46px;
      object-fit: contain;
      display: ${logoDataUri ? "block" : "none"};
    }
    .brand-name {
      font-family: "Lucida Calligraphy", "Lucida Handwriting", cursive;
      font-size: 22px;
      line-height: 0.95;
      font-weight: 700;
      color: #2749ac;
      white-space: nowrap;
      margin-top: 2px;
    }
    .brand-city {
      font-size: 10px;
      margin-left: 4px;
      color: #2749ac;
      font-weight: 700;
      margin-top: 2px;
    }
    .contact {
      font-size: 9px;
      font-weight: 700;
      color: #2f4ba8;
      line-height: 1.35;
      margin-top: 2px;
      min-width: 290px;
    }
    .contact-line {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .contact-icon-svg {
      width: 11px;
      height: 11px;
      display: inline-block;
      flex: 0 0 auto;
    }
    .contact-icon-svg path,
    .contact-icon-svg rect,
    .contact-icon-svg circle {
      stroke: #ef3b39;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .public-icon-svg {
      width: 13px;
      height: 13px;
    }
    .public-icon-svg path,
    .public-icon-svg rect,
    .public-icon-svg circle {
      fill: #ef3b39;
      stroke: none;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2px;
      color: #2b47a2;
      font-weight: 700;
      font-size: 11px;
    }
    .meta-table td {
      padding: 1px 4px;
      vertical-align: middle;
    }
    .meta-label { width: 138px; white-space: nowrap; }
    .meta-colon { width: 12px; text-align: center; }
    .meta-value {
      border-bottom: 1.6px dotted #2947a3;
      min-height: 15px;
      color: #111;
      font-weight: 600;
      padding-left: 4px;
      padding-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .decision-strip {
      margin-top: 3px;
      padding: 2px 0;
      display: flex;
      align-items: center;
      gap: 34px;
      font-size: 10px;
      font-weight: 700;
      color: #2a47a2;
    }
    .decision-rejected { color: #e53935; }
    .decision-box {
      width: 14px;
      height: 14px;
      border: 1.6px solid #3d56b6;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 6px;
      color: #111;
      font-size: 11px;
      line-height: 1;
    }
    .report-table {
      margin-top: 4px;
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      color: #2c49a6;
      font-size: 9px;
    }
    .report-table th,
    .report-table td {
      border: 1.4px solid #3d56b6;
      padding: 1px 2px;
      vertical-align: middle;
      line-height: 1.02;
      height: 14px;
    }
    .report-table thead th {
      background: #efedcf;
      font-size: 9px;
      text-align: center;
      font-weight: 700;
      height: 18px;
    }
    .sl-col { width: 8%; text-align: center; }
    .actual-col { width: 21%; }
    .tol-col { width: 11%; }
    .measure-col { width: 21%; }
    .dev-col { width: 11%; }
    .inst-col { width: 28%; }
    .inst-col-data { padding: 1px 2px; }
    .inst-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
    }
    .inst-code {
      font-size: 8px;
      font-weight: 700;
      color: #2e4ba8;
      line-height: 1;
    }
    .inst-box {
      width: 10px;
      height: 10px;
      border: 1.4px solid #3d56b6;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #111;
      line-height: 1;
      font-weight: 700;
      margin-right: 1px;
    }
    .remarks {
      margin-top: 2px;
      padding: 3px 4px 1px;
      font-size: 10px;
      color: #2e4ba8;
      font-weight: 700;
      min-height: 18px;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
      align-items: center;
    }
    .remarks-value {
      color: #111;
      min-height: 12px;
      font-weight: 500;
      padding-left: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bottom-grid {
      margin-top: 4px;
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      gap: 8px;
      align-items: start;
    }
    .legend-wrap {
      padding-left: 4px;
      color: #2d4aa9;
      font-size: 9px;
      font-weight: 700;
      line-height: 1.18;
    }
    .legend-red { color: #e53935; display: inline-block; width: 22px; }
    .damage-wrap {
      margin-top: 0;
      display: grid;
      grid-template-columns: 1fr 24px 24px;
      column-gap: 6px;
      row-gap: 3px;
      align-items: center;
      font-size: 8px;
      color: #2f4ba8;
      font-weight: 700;
    }
    .damage-column {
      padding-top: 0;
    }
    .damage-head {
      text-align: center;
      color: #3048a6;
      font-weight: 700;
      font-size: 9px;
    }
    .damage-label {
      white-space: nowrap;
      line-height: 1.1;
      font-size: 9px;
    }
    .damage-box {
      width: 14px;
      height: 14px;
      border: 1.5px solid #ef5350;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #111;
      font-size: 9px;
      font-weight: 700;
    }
    .signatures {
      margin-top: 4px;
      display: grid;
      gap: 10px;
      color: #ef5350;
      font-size: 10px;
      font-weight: 700;
      padding-right: 6px;
    }
    .sign-line {
      border-bottom: 1.5px solid #ef5350;
      min-height: 12px;
      color: #111;
      font-size: 8px;
      font-weight: 600;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 2px;
    }
    @media print {
      body { background: #fff; }
      .preview-canvas { padding: 10px 8px 8px; }
      .sheet { margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="preview-canvas">
    <div class="sheet">
      <div class="title-badge">Inspection Report</div>

      <div class="header-row">
        <div class="brand-wrap">
          ${logoDataUri ? `<img class="brand-icon" src="${logoDataUri}" alt="Unique Precision Logo" />` : ""}
          <div>
            <div class="brand-name">Unique Precision</div>
            <div class="brand-city">Bangalore - 560 091</div>
          </div>
        </div>
        <div class="contact">
          <div class="contact-line"><span>${EMAIL_ICON_SVG}</span><span>: uniqueprecision2019@gmail.com</span></div>
          <div class="contact-line"><span>${PUBLIC_ICON_SVG}</span><span>: www.uniqueprecision.in</span></div>
        </div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Customer ID</td>
          <td class="meta-colon">:</td>
          <td class="meta-value">${htmlEscape(payload.customerId)}</td>
          <td class="meta-label">Date</td>
          <td class="meta-colon">:</td>
          <td class="meta-value">${htmlEscape(payload.date)}</td>
        </tr>
        <tr>
          <td class="meta-label">Drawing Name</td>
          <td class="meta-colon">:</td>
          <td class="meta-value">${htmlEscape(payload.drawingName)}</td>
          <td class="meta-label">Drawing No.</td>
          <td class="meta-colon">:</td>
          <td class="meta-value">${htmlEscape(payload.drawingNo)}</td>
        </tr>
        <tr>
          <td class="meta-label">Quantity</td>
          <td class="meta-colon">:</td>
          <td class="meta-value">${htmlEscape(payload.quantity)}</td>
          <td colspan="3">
            <div class="decision-strip">
              <span>Accepted :<span class="decision-box">${decisionChecked(payload.decision, "ACCEPTED")}</span></span>
              <span class="decision-rejected">Rejected :<span class="decision-box">${decisionChecked(payload.decision, "REJECTED")}</span></span>
            </div>
          </td>
        </tr>
      </table>

      <table class="report-table">
        <thead>
          <tr>
            <th class="sl-col">Sl. No.</th>
            <th class="actual-col">Actual Dimension</th>
            <th class="tol-col">Tolerance</th>
            <th class="measure-col">Measuring Dimension</th>
            <th class="dev-col">Deviation</th>
            <th class="inst-col">Instruments to Measure</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="remarks">
        <span>Remarks: All Dimensions are in mm.</span>
        <span class="remarks-value">${htmlEscape(payload.remarks)}</span>
      </div>

      <div class="bottom-grid">
        <div>
          <div class="legend-wrap">
            <div><span class="legend-red">HM</span>: Height Master</div>
            <div><span class="legend-red">SG</span>: Slip Guage</div>
            <div><span class="legend-red">PG</span>: Pin Guage</div>
            <div><span class="legend-red">VC</span>: Vernier Caliper</div>
            <div><span class="legend-red">DM</span>: Digital Micro Meter</div>
          </div>
        </div>
        <div class="damage-column">
          <div class="damage-wrap">
            <div></div>
            <div class="damage-head">YES</div>
            <div class="damage-head">NO</div>

            <div class="damage-label">Work Piece Damage</div>
            <div class="damage-box">${ynCell(workPieceDamage, "YES")}</div>
            <div class="damage-box">${ynCell(workPieceDamage, "NO")}</div>

            <div class="damage-label">Any Right Angle Problem</div>
            <div class="damage-box">${ynCell(rightAngleProblem, "YES")}</div>
            <div class="damage-box">${ynCell(rightAngleProblem, "NO")}</div>

            <div class="damage-label">Any Material Problem</div>
            <div class="damage-box">${ynCell(materialProblem, "YES")}</div>
            <div class="damage-box">${ynCell(materialProblem, "NO")}</div>
          </div>
        </div>
        <div class="signatures">
          <div>
            <div>Inspected by</div>
            <div class="sign-line">${htmlEscape(inspectedBy)}</div>
          </div>
          <div>
            <div>Approved by</div>
            <div class="sign-line">${htmlEscape(approvedBy)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
};
