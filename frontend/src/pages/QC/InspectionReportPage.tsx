import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import { getJobsByGroupId } from "../../services/jobApi";
import {
  generateInspectionReport,
  getInspectionReportPreviewHtml,
  type InspectionReportPayload,
  type InspectionReportRowPayload,
  type InstrumentSelection,
} from "../../services/inspectionReportApi";
import { getUserDisplayNameFromToken } from "../../utils/auth";
import "./InspectionReportPage.css";

type Decision = "ACCEPTED" | "REJECTED";
type YesNo = "YES" | "NO" | "";
type DamageField = "workPieceDamage" | "rightAngleProblem" | "materialProblem";

const MAX_ROWS = 17;

const createEmptyInstruments = (): InstrumentSelection => ({
  hm: false,
  sg: false,
  pg: false,
  vc: false,
  dm: false,
});

const createEmptyRow = (): InspectionReportRowPayload => ({
  actualDimension: "",
  tolerance: "",
  measuringDimension: "",
  deviation: "",
  instruments: createEmptyInstruments(),
});

const getTodayIsoDate = () => {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const formatDateForTemplate = (isoDate: string) => {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const hasRowValue = (row: InspectionReportRowPayload) => {
  const hasText =
    row.actualDimension.trim() ||
    row.tolerance.trim() ||
    row.measuringDimension.trim() ||
    row.deviation.trim();
  const hasInstrument = Object.values(row.instruments).some(Boolean);
  return Boolean(hasText || hasInstrument);
};

const InspectionReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get("groupId");
  const parsedGroupId = groupIdParam ? Number(groupIdParam) : NaN;
  const groupId = Number.isFinite(parsedGroupId) ? parsedGroupId : undefined;

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rows, setRows] = useState<InspectionReportRowPayload[]>(
    [createEmptyRow()]
  );
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(getTodayIsoDate());
  const [drawingName, setDrawingName] = useState("");
  const [drawingNo, setDrawingNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [decision, setDecision] = useState<Decision>("ACCEPTED");
  const [remarks, setRemarks] = useState("");
  const [workPieceDamage, setWorkPieceDamage] = useState<YesNo>("");
  const [rightAngleProblem, setRightAngleProblem] = useState<YesNo>("");
  const [materialProblem, setMaterialProblem] = useState<YesNo>("");
  const [inspectedBy, setInspectedBy] = useState(getUserDisplayNameFromToken() || "");
  const [approvedBy, setApprovedBy] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "info";
    visible: boolean;
  }>({
    message: "",
    variant: "info",
    visible: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!groupId) return;
    let isMounted = true;
    const loadGroup = async () => {
      try {
        setLoading(true);
        const jobs = await getJobsByGroupId(groupId);
        if (!isMounted || jobs.length === 0) return;

        const parent = jobs[0];
        const totalQty = jobs.reduce((sum, job) => sum + Number(job.qty || 0), 0);
        setCustomerId(String(parent.customer || ""));
        setDrawingName(String(parent.description || ""));
        setDrawingNo(String((parent as any).programRefFile || parent.refNumber || ""));
        setQuantity(totalQty > 0 ? String(totalQty) : "");

        const seededRows = jobs.slice(0, MAX_ROWS).map((job) => ({
          ...createEmptyRow(),
          actualDimension: String(job.cut || ""),
        }));
        if (seededRows.length === 0) seededRows.push(createEmptyRow());
        setRows(seededRows);
      } catch (error) {
        setToast({
          message: "Failed to load group details for inspection report.",
          variant: "error",
          visible: true,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadGroup();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  const updateRowText = (index: number, key: keyof Omit<InspectionReportRowPayload, "instruments">, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const toggleInstrument = (index: number, key: keyof InstrumentSelection) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        instruments: {
          ...next[index].instruments,
          [key]: !next[index].instruments[key],
        },
      };
      return next;
    });
  };

  const setDamageState = (field: DamageField, value: YesNo) => {
    if (field === "workPieceDamage") setWorkPieceDamage(value);
    if (field === "rightAngleProblem") setRightAngleProblem(value);
    if (field === "materialProblem") setMaterialProblem(value);
  };

  const activeRowCount = useMemo(() => rows.filter(hasRowValue).length, [rows]);
  const previewRequestRef = useRef(0);

  const addMeasurementRow = () => {
    setRows((prev) => {
      if (prev.length >= MAX_ROWS) return prev;
      return [...prev, createEmptyRow()];
    });
  };

  const removeMeasurementRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const clearMeasurementRow = (index: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = createEmptyRow();
      return next;
    });
  };

  const downloadBlob = (blob: Blob) => {
    const filenameGroup = groupId ? `-${groupId}` : "";
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `inspection-report${filenameGroup}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reportPayload = useMemo<InspectionReportPayload>(
    () => ({
      groupId,
      customerId: customerId.trim(),
      date: formatDateForTemplate(date),
      drawingName: drawingName.trim(),
      drawingNo: drawingNo.trim(),
      quantity: quantity.trim(),
      decision,
      rows,
      remarks: remarks.trim(),
      workPieceDamage,
      rightAngleProblem,
      materialProblem,
      inspectedBy: inspectedBy.trim().toUpperCase(),
      approvedBy: approvedBy.trim().toUpperCase(),
    }),
    [
      groupId,
      customerId,
      date,
      drawingName,
      drawingNo,
      quantity,
      decision,
      rows,
      remarks,
      workPieceDamage,
      rightAngleProblem,
      materialProblem,
      inspectedBy,
      approvedBy,
    ]
  );

  const refreshPreview = useCallback(
    async (payload: InspectionReportPayload = reportPayload) => {
      const requestId = previewRequestRef.current + 1;
      previewRequestRef.current = requestId;
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const html = await getInspectionReportPreviewHtml(payload);
        if (requestId !== previewRequestRef.current) return;
        setPreviewHtml(html);
      } catch (error: any) {
        if (requestId !== previewRequestRef.current) return;
        setPreviewError(error?.message || "Failed to load live preview.");
      } finally {
        if (requestId === previewRequestRef.current) {
          setPreviewLoading(false);
        }
      }
    },
    [reportPayload]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshPreview();
    }, 650);
    return () => clearTimeout(timer);
  }, [refreshPreview]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const blob = await generateInspectionReport(reportPayload);
      downloadBlob(blob);
      setToast({ message: "Inspection report generated.", variant: "success", visible: true });
    } catch (error: any) {
      setToast({
        message: error?.message || "Failed to generate inspection report.",
        variant: "error",
        visible: true,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    const draftKey = `qc-inspection-report-draft:${groupId ?? "default"}`;
    const draftData = {
      groupId,
      customerId,
      date,
      drawingName,
      drawingNo,
      quantity,
      decision,
      rows,
      remarks,
      workPieceDamage,
      rightAngleProblem,
      materialProblem,
      inspectedBy: inspectedBy.trim().toUpperCase(),
      approvedBy: approvedBy.trim().toUpperCase(),
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setToast({ message: "Inspection report saved.", variant: "success", visible: true });
    } catch (error) {
      setToast({ message: "Failed to save inspection report.", variant: "error", visible: true });
    }
  };

  const renderYesNoRow = (label: string, field: DamageField, value: YesNo) => (
    <div className="qc-report-damage-row">
      <span>{label}</span>
      <label>
        <input
          type="radio"
          checked={value === "YES"}
          onChange={() => setDamageState(field, "YES")}
        />
        Yes
      </label>
      <label>
        <input
          type="radio"
          checked={value === "NO"}
          onChange={() => setDamageState(field, "NO")}
        />
        No
      </label>
      <button
        type="button"
        className="qc-report-clear-toggle"
        onClick={() => setDamageState(field, "")}
      >
        Clear
      </button>
    </div>
  );

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/qc" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Inspection Report" />
        <div className="roleboard-body qc-report-panel">
          <div className="qc-report-toolbar">
            <div className="qc-report-toolbar-meta">
              <span>Group: {groupId ?? "N/A"}</span>
              <span>Filled Rows: {activeRowCount}</span>
            </div>
          </div>

          <div className="qc-report-layout">
            <section className="qc-report-left">
              <h3>Report Details</h3>
              {loading && <p className="qc-report-loading">Loading group details...</p>}

              <div className="qc-report-inline-fields">
                <label>
                  Customer ID
                  <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                </label>
                <label>
                  Date
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label>
                  Quantity
                  <input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </label>
              </div>

              <label>
                Drawing Name
                <input value={drawingName} onChange={(e) => setDrawingName(e.target.value)} />
              </label>
              <label>
                Drawing No.
                <input value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} />
              </label>

              <div className="qc-report-table-title-row">
                <h3>Measurement Inputs (Max 17 Rows)</h3>
                <button
                  type="button"
                  className="qc-report-add-row-btn"
                  onClick={addMeasurementRow}
                  disabled={rows.length >= MAX_ROWS}
                >
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
                      <th>Measuring Dimension</th>
                      <th>Deviation</th>
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
                        <td>
                          <input
                            value={row.actualDimension}
                            onChange={(e) => updateRowText(index, "actualDimension", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={row.tolerance}
                            onChange={(e) => updateRowText(index, "tolerance", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={row.measuringDimension}
                            onChange={(e) => updateRowText(index, "measuringDimension", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={row.deviation}
                            onChange={(e) => updateRowText(index, "deviation", e.target.value)}
                          />
                        </td>
                        {(Object.keys(row.instruments) as Array<keyof InstrumentSelection>).map((key) => (
                          <td key={key} className="qc-report-check-cell">
                            <input
                              type="checkbox"
                              checked={row.instruments[key]}
                              onChange={() => toggleInstrument(index, key)}
                            />
                          </td>
                        ))}
                        <td>
                          <div className="qc-report-action-buttons">
                            <button
                              type="button"
                              className="qc-report-action-btn clear"
                              onClick={() => clearMeasurementRow(index)}
                              title="Clear row"
                              aria-label={`Clear row ${index + 1}`}
                            >
                              <CleaningServicesIcon fontSize="inherit" />
                            </button>
                            <button
                              type="button"
                              className="qc-report-action-btn remove"
                              onClick={() => removeMeasurementRow(index)}
                              disabled={rows.length <= 1}
                              title="Remove row"
                              aria-label={`Remove row ${index + 1}`}
                            >
                              <DeleteOutlineIcon fontSize="inherit" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="qc-report-decision">
                <span>Decision</span>
                <label>
                  <input type="radio" checked={decision === "ACCEPTED"} onChange={() => setDecision("ACCEPTED")} />
                  Accepted
                </label>
                <label>
                  <input type="radio" checked={decision === "REJECTED"} onChange={() => setDecision("REJECTED")} />
                  Rejected
                </label>
              </div>

              <label>
                Remarks
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Optional remarks"
                />
              </label>

              <div className="qc-report-damage">
                <h4>Damage Checks</h4>
                {renderYesNoRow("Work Piece Damage", "workPieceDamage", workPieceDamage)}
                {renderYesNoRow("Any Right Angle Problem", "rightAngleProblem", rightAngleProblem)}
                {renderYesNoRow("Any Material Problem", "materialProblem", materialProblem)}
              </div>

              <label>
                Inspected By
                <input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
              </label>
              <label>
                Approved By
                <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
              </label>

              <div className="qc-report-action-row">
                <button
                  type="button"
                  className="qc-report-save-btn"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="qc-report-generate-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </section>

            <section className="qc-report-right">
              <div className="qc-report-preview-head">
                <h3>Live Report Preview</h3>
                <button
                  type="button"
                  className="qc-report-refresh-btn"
                  onClick={() => void refreshPreview()}
                  disabled={previewLoading}
                >
                  {previewLoading ? "Updating..." : "Refresh"}
                </button>
              </div>
              <p className="qc-report-preview-note">
                Preview updates automatically while typing.
              </p>
              <div className="qc-report-preview-shell">
                {previewError ? (
                  <div className="qc-report-preview-state error">{previewError}</div>
                ) : previewHtml ? (
                  <iframe
                    title="Inspection Report Preview"
                    className="qc-report-preview-frame"
                    srcDoc={previewHtml}
                  />
                ) : (
                  <div className="qc-report-preview-state">Preview will appear here.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      <Toast
        message={toast.message}
        variant={toast.variant}
        visible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default InspectionReportPage;
