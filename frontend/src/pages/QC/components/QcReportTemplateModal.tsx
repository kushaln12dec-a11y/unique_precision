import Modal from "../../../components/Modal";

type TemplateVariant = "DEFAULT" | "TOOLING_SPARE";

type QcReportTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  actionLabel: "Open" | "Download";
  onSelectTemplate: (variant: TemplateVariant) => void;
};

const templateOptions: Array<{
  variant: TemplateVariant;
  title: string;
  description: string;
}> = [
  {
    variant: "DEFAULT",
    title: "Single Quantity Layout",
    description: "Use this for one quantity per report page.",
  },
  {
    variant: "TOOLING_SPARE",
    title: "Consolidated Layout",
    description: "Use this for multiple quantities in one landscape report.",
  },
];

const QcReportTemplateModal = ({
  isOpen,
  onClose,
  actionLabel,
  onSelectTemplate,
}: QcReportTemplateModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Choose Inspection Report Layout" size="small">
    <div className="qc-template-modal-grid">
      {templateOptions.map((option) => (
        <button
          type="button"
          key={option.variant}
          className="qc-template-option"
          onClick={() => onSelectTemplate(option.variant)}
        >
          <strong>{option.title}</strong>
          <span>{option.description}</span>
          <em>{actionLabel}</em>
        </button>
      ))}
    </div>
  </Modal>
);

export default QcReportTemplateModal;
