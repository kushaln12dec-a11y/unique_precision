import { useState } from "react";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Modal from "../../../components/Modal";

type TemplateVariant = "DEFAULT" | "TOOLING_SPARE";

type QcReportTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  actionLabel: "Open" | "Download";
  onSelectTemplate: (variant: TemplateVariant, count: number) => void;
  maxQuantity: number;
};

const QcReportTemplateModal = ({
  isOpen,
  onClose,
  actionLabel,
  onSelectTemplate,
  maxQuantity,
}: QcReportTemplateModalProps) => {
  const [singleCount, setSingleCount] = useState(1);
  const [consolidatedCount, setConsolidatedCount] = useState(Math.max(1, maxQuantity));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Inspection Report Layout" size="small">
      <div className="qc-template-modal-grid">

        {/* Single Quantity Layout Card */}
        <div className="qc-template-card qc-template-card--single">
          <div className="qc-template-card-header">
            <div className="qc-template-card-icon">
              <DescriptionOutlinedIcon fontSize="inherit" />
            </div>
            <div>
              <div className="qc-template-card-title">Single Quantity Layout</div>
              <div className="qc-template-card-desc">
                Generate an individual inspection report for each quantity. Best suited when detailed per-unit analysis is required.
              </div>
            </div>
          </div>
          <div className="qc-template-card-body">
            <span className="qc-template-qty-label">
              How many quantities to inspect?
            </span>
            <select
              className="qc-template-qty-input"
              value={singleCount}
              onChange={(e) => setSingleCount(Number(e.target.value) || 1)}
              onClick={(e) => e.stopPropagation()}
            >
              {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((qty) => (
                <option key={qty} value={qty}>{qty}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="qc-template-card-action"
            onClick={() => onSelectTemplate("DEFAULT", singleCount)}
          >
            {actionLabel} Report <ArrowForwardIcon />
          </button>
        </div>

        <div className="qc-template-divider"><span>OR</span></div>

        {/* Consolidated Layout Card */}
        <div className="qc-template-card qc-template-card--consolidated">
          <div className="qc-template-card-header">
            <div className="qc-template-card-icon">
              <ViewModuleOutlinedIcon fontSize="inherit" />
            </div>
            <div>
              <div className="qc-template-card-title">Consolidated Layout</div>
              <div className="qc-template-card-desc">
                Combine multiple quantities into a single report sheet with separate Sample columns for each. Ideal for batch inspection.
              </div>
            </div>
          </div>
          <div className="qc-template-card-body">
            <span className="qc-template-qty-label">
              How many quantities in one report?
            </span>
            <select
              className="qc-template-qty-input"
              value={consolidatedCount}
              onChange={(e) => setConsolidatedCount(Number(e.target.value) || 1)}
              onClick={(e) => e.stopPropagation()}
            >
              {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((qty) => (
                <option key={qty} value={qty}>{qty}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="qc-template-card-action"
            onClick={() => onSelectTemplate("TOOLING_SPARE", consolidatedCount)}
          >
            {actionLabel} Report <ArrowForwardIcon />
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default QcReportTemplateModal;
