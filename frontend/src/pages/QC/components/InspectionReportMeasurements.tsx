import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import type { InspectionReportRowPayload, InstrumentSelection } from "../../../services/inspectionReportApi";

type Props = {
  rows: InspectionReportRowPayload[];
  onAddRow: () => void;
  onUpdateText: (index: number, key: keyof Omit<InspectionReportRowPayload, "instruments" | "samples">, value: string) => void;
  onUpdateSample?: (rowIndex: number, sampleIndex: number, value: string) => void;
  onToggleInstrument: (index: number, key: keyof InstrumentSelection) => void;
  onClearRow: (index: number) => void;
  onRemoveRow: (index: number) => void;
  maxRows: number;
  templateVariant?: "DEFAULT" | "TOOLING_SPARE";
  quantityCount?: number;
};

const InspectionReportMeasurements = ({
  rows,
  onAddRow,
  onUpdateText,
  onUpdateSample,
  onToggleInstrument,
  onClearRow,
  onRemoveRow,
  maxRows,
  templateVariant = "DEFAULT",
  quantityCount = 1,
}: Props) => {
  const isConsolidated = templateVariant === "TOOLING_SPARE";
  const numSamples = Math.max(1, quantityCount);
  const sampleIndices = Array.from({ length: numSamples }, (_, i) => i);

  return (
    <>
      <div className="qc-report-table-title-row">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h3>Measurement Inputs (Max {maxRows} Rows)</h3>
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
              {!isConsolidated ? (
                <>
                  <th>Measuring Dimension</th>
                  <th>Deviation</th>
                </>
              ) : (
                sampleIndices.map((i) => <th key={i}>Sample {i + 1}</th>)
              )}
              <th>HM</th>
              <th>SG</th>
              <th>PG</th>
              <th>VC</th>
              <th>DM</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const samples = row.samples || [];
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td><input value={row.actualDimension || ""} onChange={(e) => onUpdateText(index, "actualDimension", e.target.value)} /></td>
                  <td><input value={row.tolerance || ""} onChange={(e) => onUpdateText(index, "tolerance", e.target.value)} /></td>

                  {!isConsolidated ? (
                    <>
                      <td><input value={row.measuringDimension || ""} onChange={(e) => onUpdateText(index, "measuringDimension", e.target.value)} /></td>
                      <td><input value={row.deviation || ""} onChange={(e) => onUpdateText(index, "deviation", e.target.value)} /></td>
                    </>
                  ) : (
                    sampleIndices.map((i) => (
                      <td key={i}>
                        <input
                          value={samples[i] || ""}
                          onChange={(e) => onUpdateSample?.(index, i, e.target.value)}
                        />
                      </td>
                    ))
                  )}

                  {(Object.keys(row.instruments) as Array<keyof InstrumentSelection>).map((key) => (
                    <td key={key} className="qc-report-check-cell">
                      <input type="checkbox" checked={row.instruments[key] || false} onChange={() => onToggleInstrument(index, key)} />
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default InspectionReportMeasurements;
