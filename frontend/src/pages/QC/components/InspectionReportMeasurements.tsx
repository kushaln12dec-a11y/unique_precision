import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import type { InspectionReportRowPayload, InstrumentSelection } from "../../../services/inspectionReportApi";

type Props = {
  rows: InspectionReportRowPayload[];
  onAddRow: () => void;
  onUpdateText: (index: number, key: keyof Omit<InspectionReportRowPayload, "instruments">, value: string) => void;
  onToggleInstrument: (index: number, key: keyof InstrumentSelection) => void;
  onClearRow: (index: number) => void;
  onRemoveRow: (index: number) => void;
  maxRows: number;
  templateVariant?: "DEFAULT" | "TOOLING_SPARE";
  linkQuantities?: boolean;
  onToggleLinkQuantities?: () => void;
};

const InspectionReportMeasurements = ({
  rows,
  onAddRow,
  onUpdateText,
  onToggleInstrument,
  onClearRow,
  onRemoveRow,
  maxRows,
  templateVariant = "DEFAULT",
  linkQuantities,
  onToggleLinkQuantities,
}: Props) => (
  <>
    <div className="qc-report-table-title-row">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h3>Measurement Inputs (Max 30 Rows)</h3>
        {templateVariant === "TOOLING_SPARE" && (
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input type="checkbox" checked={linkQuantities} onChange={onToggleLinkQuantities} />
            Link Quantity 1 & 2 Results
          </label>
        )}
      </div>
      <button type="button" className="qc-report-add-row-btn" onClick={onAddRow} disabled={rows.length >= maxRows}>
        Add Row
      </button>
    </div>
    <div className="qc-report-table-wrap">
      <table className="qc-report-table">
        <thead>
          <tr>
            <th>Sl</th>
            <th>Actual Dimension</th>
            <th>Tolerance</th>
            <th>{templateVariant === "TOOLING_SPARE" ? "Quantity 1 Result" : "Measuring Dimension"}</th>
            <th>{templateVariant === "TOOLING_SPARE" ? "Quantity 2 Result" : "Deviation"}</th>
            <th>HM</th>
            <th>SG</th>
            <th>PG</th>
            <th>VC</th>
            <th>DM</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td><input value={row.actualDimension} onChange={(e) => onUpdateText(index, "actualDimension", e.target.value)} /></td>
              <td><input value={row.tolerance} onChange={(e) => onUpdateText(index, "tolerance", e.target.value)} /></td>
              <td><input value={row.measuringDimension} onChange={(e) => onUpdateText(index, "measuringDimension", e.target.value)} /></td>
              <td><input value={row.deviation} onChange={(e) => onUpdateText(index, "deviation", e.target.value)} /></td>
              {(Object.keys(row.instruments) as Array<keyof InstrumentSelection>).map((key) => (
                <td key={key} className="qc-report-check-cell">
                  <input type="checkbox" checked={row.instruments[key]} onChange={() => onToggleInstrument(index, key)} />
                </td>
              ))}
              <td>
                <div className="qc-report-action-buttons">
                  <button type="button" className="qc-report-action-btn clear" onClick={() => onClearRow(index)} title="Clear row" aria-label={`Clear row ${index + 1}`}>
                    <CleaningServicesIcon fontSize="inherit" />
                  </button>
                  <button type="button" className="qc-report-action-btn remove" onClick={() => onRemoveRow(index)} disabled={rows.length <= 1} title="Remove row" aria-label={`Remove row ${index + 1}`}>
                    <DeleteOutlineIcon fontSize="inherit" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

export default InspectionReportMeasurements;
