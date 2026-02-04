import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
import "./DateTimeInput.css";

type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
};

const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  placeholder = "DD/MM/YYYY HH:MM",
  error,
  className = "",
}) => {
  const handleIconClick = () => {
    const currentISTTime = getCurrentISTDateTime();
    onChange(currentISTTime);
  };

  return (
    <div className={`datetime-input-wrapper ${className}`}>
      <div className="datetime-input-container">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`datetime-input ${error ? "input-error" : ""}`}
        />
        <button
          type="button"
          className="datetime-icon-button"
          onClick={handleIconClick}
          aria-label="Fill current IST time"
          title="Fill current IST time"
        >
          <AccessTimeIcon fontSize="small" />
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

export default DateTimeInput;

