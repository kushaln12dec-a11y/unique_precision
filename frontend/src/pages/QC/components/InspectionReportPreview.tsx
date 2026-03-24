const InspectionReportPreview = ({
  previewLoading,
  previewError,
  previewHtml,
  onRefresh,
}: {
  previewLoading: boolean;
  previewError: string;
  previewHtml: string;
  onRefresh: () => void;
}) => (
  <section className="qc-report-right">
    <div className="qc-report-preview-head">
      <h3>Live Report Preview</h3>
      <button type="button" className="qc-report-refresh-btn" onClick={onRefresh} disabled={previewLoading}>
        {previewLoading ? "Updating..." : "Refresh"}
      </button>
    </div>
    <p className="qc-report-preview-note">Preview updates automatically while typing.</p>
    <div className="qc-report-preview-shell">
      {previewError ? (
        <div className="qc-report-preview-state error">{previewError}</div>
      ) : previewHtml ? (
        <iframe title="Inspection Report Preview" className="qc-report-preview-frame" srcDoc={previewHtml} />
      ) : (
        <div className="qc-report-preview-state">Preview will appear here.</div>
      )}
    </div>
  </section>
);

export default InspectionReportPreview;
