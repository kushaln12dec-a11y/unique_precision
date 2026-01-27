type AccordionToggleProps = {
  isExpanded: boolean;
  onToggle: () => void;
  ariaLabel: string;
};

const AccordionToggle: React.FC<AccordionToggleProps> = ({
  isExpanded,
  onToggle,
  ariaLabel,
}) => {
  return (
    <td className="accordion-toggle-cell">
      <button
        type="button"
        className="accordion-toggle-button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-label={ariaLabel}
      >
        <span className="accordion-toggle-icon">
          {isExpanded ? "▴" : "▾"}
        </span>
      </button>
    </td>
  );
};

export default AccordionToggle;
