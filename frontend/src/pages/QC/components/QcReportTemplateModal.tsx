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
    description: "Create one report sheet for one quantity only.",
  },
  {
    variant: "TOOLING_SPARE",
    title: "Consolidated Layout",
    description: "Create one sheet for multiple quantities. The PDF uses Quantity 1 and Quantity 2 labels for clarity.",
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
