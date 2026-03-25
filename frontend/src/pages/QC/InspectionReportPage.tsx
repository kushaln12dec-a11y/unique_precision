import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import { getJobsByGroupId } from "../../services/jobApi";
import { generateInspectionReport, getInspectionReportPreviewHtml, type InspectionReportPayload, type InspectionReportRowPayload, type InstrumentSelection } from "../../services/inspectionReportApi";
import { getUserDisplayNameFromToken } from "../../utils/auth";
import InspectionReportDamageChecks from "./components/InspectionReportDamageChecks";
import InspectionReportMeasurements from "./components/InspectionReportMeasurements";
import InspectionReportPreview from "./components/InspectionReportPreview";
import { type DamageField, type Decision, type YesNo, MAX_ROWS, createEmptyRow, formatDateForTemplate, getTodayIsoDate, hasRowValue } from "./inspectionReportUtils";
import "./InspectionReportPage.css";

const InspectionReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId")?.trim() || undefined;
  const jobId = searchParams.get("jobId")?.trim() || undefined;
  const quantityNumber = Number(searchParams.get("quantityNumber") || 0) || undefined;
  const quantityFrom = Number(searchParams.get("quantityFrom") || 0) || undefined;
  const quantityTo = Number(searchParams.get("quantityTo") || 0) || undefined;
  const quantityCount = Number(searchParams.get("quantityCount") || 0) || undefined;
  const templateVariant = searchParams.get("templateVariant") === "TOOLING_SPARE" ? "TOOLING_SPARE" : "DEFAULT";
  const previewRequestRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rows, setRows] = useState<InspectionReportRowPayload[]>([createEmptyRow()]);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(getTodayIsoDate());
  const [drawingName, setDrawingName] = useState("");
  const [drawingNo, setDrawingNo] = useState("");
  const [toolingDetails, setToolingDetails] = useState({
    toolIdentificationNo: "",
    consumablePartIdentificationNo: "",
    consumablePartName: "",
  });
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
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({ message: "", variant: "info", visible: false });
  const setToolingField = (field: "toolIdentificationNo" | "consumablePartIdentificationNo" | "consumablePartName", value: string) =>
    setToolingDetails((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!groupId) return;
    let isMounted = true;

    const loadGroup = async () => {
      try {
        setLoading(true);
        const jobs = await getJobsByGroupId(groupId);
        if (!isMounted || jobs.length === 0) return;

        const selectedJob = (jobId ? jobs.find((job) => String(job.id) === jobId) : null) || jobs[0];
        const targetQuantityCount =
          quantityCount ||
          (quantityFrom && quantityTo ? Math.max(1, quantityTo - quantityFrom + 1) : 0) ||
          (quantityNumber ? 1 : 0) ||
          Math.max(1, Number(selectedJob.qty || 1));

        setCustomerId(String(selectedJob.customer || ""));
        setDrawingName(String(selectedJob.description || ""));
        setDrawingNo(String((selectedJob as any).programRefFile || selectedJob.refNumber || ""));
        setToolingDetails({
          toolIdentificationNo: String((selectedJob as any).programRefFile || selectedJob.refNumber || ""),
          consumablePartIdentificationNo: String((selectedJob as any).programRefFile || selectedJob.refNumber || ""),
          consumablePartName: String(selectedJob.description || ""),
        });
        setQuantity(targetQuantityCount > 0 ? String(targetQuantityCount) : "1");

        const templateRows = templateVariant === "TOOLING_SPARE"
          ? Array.from({ length: Math.min(MAX_ROWS, Math.max(1, targetQuantityCount)) }, () => ({ ...createEmptyRow(), actualDimension: String(selectedJob.cut || "") }))
          : [{ ...createEmptyRow(), actualDimension: String(selectedJob.cut || "") }];

        setRows(templateRows);
      } catch {
        setToast({ message: "Failed to load group details for inspection report.", variant: "error", visible: true });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadGroup();
    return () => {
      isMounted = false;
    };
  }, [groupId, jobId, quantityCount, quantityFrom, quantityNumber, quantityTo, templateVariant]);

  const reportPayload = useMemo<InspectionReportPayload>(
    () => ({
      groupId,
      jobId,
      quantityNumber,
      quantityFrom,
      quantityTo,
      quantityCount,
      templateVariant,
      customerId: customerId.trim(),
      date: formatDateForTemplate(date),
      drawingName: drawingName.trim(),
      drawingNo: drawingNo.trim(),
      toolIdentificationNo: toolingDetails.toolIdentificationNo.trim(),
      consumablePartIdentificationNo: toolingDetails.consumablePartIdentificationNo.trim(),
      consumablePartName: toolingDetails.consumablePartName.trim(),
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
    [approvedBy, customerId, date, decision, drawingName, drawingNo, groupId, inspectedBy, jobId, materialProblem, quantity, quantityCount, quantityFrom, quantityNumber, quantityTo, remarks, rightAngleProblem, rows, templateVariant, toolingDetails, workPieceDamage]
  );

  const refreshPreview = useCallback(async (payload: InspectionReportPayload = reportPayload) => {
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
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  }, [reportPayload]);

  useEffect(() => {
    const timer = setTimeout(() => void refreshPreview(), 650);
    return () => clearTimeout(timer);
  }, [refreshPreview]);

  const updateRowText = (index: number, key: keyof Omit<InspectionReportRowPayload, "instruments">, value: string) => {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };

  const toggleInstrument = (index: number, key: keyof InstrumentSelection) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, instruments: { ...row.instruments, [key]: !row.instruments[key] } } : row
      )
    );
  };

  const setDamageState = (field: DamageField, value: YesNo) => {
    if (field === "workPieceDamage") setWorkPieceDamage(value);
    if (field === "rightAngleProblem") setRightAngleProblem(value);
    if (field === "materialProblem") setMaterialProblem(value);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const blob = await generateInspectionReport(reportPayload);
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `inspection-report${groupId ? `-${groupId}` : ""}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ message: "Inspection report generated.", variant: "success", visible: true });
    } catch (error: any) {
      setToast({ message: error?.message || "Failed to generate inspection report.", variant: "error", visible: true });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        `qc-inspection-report-draft:${groupId ?? "default"}`,
        JSON.stringify({ ...reportPayload, inspectedBy: inspectedBy.trim().toUpperCase(), approvedBy: approvedBy.trim().toUpperCase() })
      );
      setToast({ message: "Inspection report saved.", variant: "success", visible: true });
    } catch {
      setToast({ message: "Failed to save inspection report.", variant: "error", visible: true });
    }
  };

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/qc" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Inspection Report" />
        <div className="roleboard-body qc-report-panel">
          <div className="qc-report-toolbar">
            <div className="qc-report-toolbar-meta">
              <span>Rows Added: {rows.length}</span>
              <span>Filled Rows: {rows.filter(hasRowValue).length}</span>
            </div>
          </div>

          <div className="qc-report-layout">
            <section className="qc-report-left">
              <h3>Report Details</h3>
              {loading && <AppLoader variant="inline" message="Loading group details..." />}

              <div className="qc-report-inline-fields">
                <label>Customer ID<input value={customerId} onChange={(e) => setCustomerId(e.target.value)} /></label>
                <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label>Quantity<input value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
              </div>

              <label>Drawing Name<input value={drawingName} onChange={(e) => setDrawingName(e.target.value)} /></label>
              <label>Drawing No.<input value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} /></label>
              {templateVariant === "TOOLING_SPARE" && (
                <div className="qc-report-tooling-fields">
                  <label>Tool Identification No.<input value={toolingDetails.toolIdentificationNo} onChange={(e) => setToolingField("toolIdentificationNo", e.target.value)} /></label>
                  <label>Consumable Part Identification No.<input value={toolingDetails.consumablePartIdentificationNo} onChange={(e) => setToolingField("consumablePartIdentificationNo", e.target.value)} /></label>
                  <label>Consumable Part Name<input value={toolingDetails.consumablePartName} onChange={(e) => setToolingField("consumablePartName", e.target.value)} /></label>
                </div>
              )}

              <InspectionReportMeasurements
                rows={rows}
                onAddRow={() => setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, createEmptyRow()]))}
                onUpdateText={updateRowText}
                onToggleInstrument={toggleInstrument}
                onClearRow={(index) => setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? createEmptyRow() : row)))}
                onRemoveRow={(index) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)))}
                maxRows={MAX_ROWS}
              />

              <div className="qc-report-decision">
                <span>Decision</span>
                <label><input type="radio" checked={decision === "ACCEPTED"} onChange={() => setDecision("ACCEPTED")} />Accepted</label>
                <label><input type="radio" checked={decision === "REJECTED"} onChange={() => setDecision("REJECTED")} />Rejected</label>
              </div>

              <label>
                Remarks
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Optional remarks" />
              </label>

              <InspectionReportDamageChecks
                workPieceDamage={workPieceDamage}
                rightAngleProblem={rightAngleProblem}
                materialProblem={materialProblem}
                onChange={setDamageState}
              />

              <label>Inspected By<input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} /></label>
              <label>Approved By<input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></label>

              <div className="qc-report-action-row">
                <button type="button" className="qc-report-save-btn" onClick={handleSave}>Save</button>
                <button type="button" className="qc-report-generate-btn" onClick={() => void handleGenerate()} disabled={generating}>
                  {generating ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </section>

            <InspectionReportPreview previewLoading={previewLoading} previewError={previewError} previewHtml={previewHtml} onRefresh={() => void refreshPreview()} />
          </div>
        </div>
      </div>
      <Toast message={toast.message} variant={toast.variant} visible={toast.visible} onClose={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </div>
  );
};

export default InspectionReportPage;
