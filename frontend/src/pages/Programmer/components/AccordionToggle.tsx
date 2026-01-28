import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";

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
        style={{
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      >
        <ArrowForwardIosSharpIcon 
          sx={{ fontSize: "0.7rem", color: "#1e293b" }}
        />
      </button>
    </td>
  );
};

export default AccordionToggle;
