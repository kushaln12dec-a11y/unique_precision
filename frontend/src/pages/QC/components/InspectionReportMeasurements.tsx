import { useState, useEffect } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import type { InspectionReportRowPayload, InstrumentSelection } from "../../../services/inspectionReportApi";
import { ENTRIES_PER_PAGE } from "../inspectionReportUtils";

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

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / ENTRIES_PER_PAGE));

  // Reset or adjust page if rows shrink below current page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [rows.length, totalPages, currentPage]);

  const handleAddRow = () => {
    onAddRow();
    // Auto switch to page containing the newly added row
    const nextTotalRows = rows.length + 1;
    const targetPage = Math.ceil(nextTotalRows / ENTRIES_PER_PAGE);
    setCurrentPage(targetPage);
  };

  const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
  const endIndex = Math.min(rows.length, startIndex + ENTRIES_PER_PAGE);
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <>
      <div className="qc-report-table-title-row">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h3>Measurement Inputs (50 Entries / Page)</h3>
          <span className="qc-report-entry-badge">
            Showing {rows.length === 0 ? 0 : startIndex + 1}–{endIndex} of {rows.length} Total Entries
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button type="button" className="qc-report-add-row-btn" onClick={handleAddRow} disabled={rows.length >= maxRows}>
            + Add Row
          </button>
        </div>
      </div>

      {/* Top Pagination Control */}
      {totalPages > 1 && (
        <div className="qc-report-pagination">
          <button
            type="button"
            className="qc-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <NavigateBeforeIcon fontSize="small" /> Previous Page
          </button>
          <div className="qc-pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`qc-pagination-num ${page === currentPage ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                Page {page}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="qc-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next Page <NavigateNextIcon fontSize="small" />
          </button>
        </div>
      )}

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
            {visibleRows.map((row, relativeIndex) => {
              const globalIndex = startIndex + relativeIndex;
              const samples = row.samples || [];
              return (
                <tr key={globalIndex}>
                  <td className="qc-sl-cell"><strong>{globalIndex + 1}</strong></td>
                  <td><input value={row.actualDimension || ""} onChange={(e) => onUpdateText(globalIndex, "actualDimension", e.target.value)} /></td>
                  <td><input value={row.tolerance || ""} onChange={(e) => onUpdateText(globalIndex, "tolerance", e.target.value)} /></td>

                  {!isConsolidated ? (
                    <>
                      <td><input value={row.measuringDimension || ""} onChange={(e) => onUpdateText(globalIndex, "measuringDimension", e.target.value)} /></td>
                      <td><input value={row.deviation || ""} onChange={(e) => onUpdateText(globalIndex, "deviation", e.target.value)} /></td>
                    </>
                  ) : (
                    sampleIndices.map((i) => (
                      <td key={i}>
                        <input
                          value={samples[i] || ""}
                          onChange={(e) => onUpdateSample?.(globalIndex, i, e.target.value)}
                        />
                      </td>
                    ))
                  )}

                  {(Object.keys(row.instruments) as Array<keyof InstrumentSelection>).map((key) => (
                    <td key={key} className="qc-report-check-cell">
                      <input type="checkbox" checked={row.instruments[key] || false} onChange={() => onToggleInstrument(globalIndex, key)} />
                    </td>
                  ))}
                  <td>
                    <div className="qc-report-action-buttons">
                      <button type="button" className="qc-report-action-btn clear" onClick={() => onClearRow(globalIndex)} title="Clear row" aria-label={`Clear row ${globalIndex + 1}`}>
                        <CleaningServicesIcon fontSize="inherit" />
                      </button>
                      <button type="button" className="qc-report-action-btn remove" onClick={() => onRemoveRow(globalIndex)} disabled={rows.length <= 1} title="Remove row" aria-label={`Remove row ${globalIndex + 1}`}>
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

      {/* Bottom Pagination Control */}
      {totalPages > 1 && (
        <div className="qc-report-pagination bottom">
          <span className="qc-pagination-info">
            Page {currentPage} of {totalPages} ({rows.length} total entries)
          </span>
          <div className="qc-pagination-controls">
            <button
              type="button"
              className="qc-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <NavigateBeforeIcon fontSize="small" /> Previous
            </button>
            <button
              type="button"
              className="qc-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <NavigateNextIcon fontSize="small" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InspectionReportMeasurements;
