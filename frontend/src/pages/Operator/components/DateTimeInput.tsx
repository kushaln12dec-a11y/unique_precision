import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
import "./DateTimeInput.css";

type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onTimeCapture?: (timestampMs: number) => void; // Callback when time is captured via icon click
  placeholder?: string;
  error?: string;
  className?: string;
  showPauseButton?: boolean; // Show pause button for Start Time
  isPaused?: boolean; // Current pause state
  onPauseToggle?: () => void; // Callback for pause/resume
  disabled?: boolean; // Disable input (for End Time after first click)
};

/**
 * DateTimeInput Component
 * 
 * HOW START TIME AND END TIME WORK:
 * ==================================
 * 
 * 1. USER CLICKS THE CLOCK ICON (🕐):
 *    - When the user clicks the clock icon next to "Start Time" or "End Time" field,
 *      the `handleIconClick` function is triggered
 * 
 * 2. CAPTURES CURRENT IST TIME:
 *    - Calls `getCurrentISTDateTime()` which:
 *      * Gets the current moment in time from the system
 *      * Converts it to IST (Indian Standard Time, UTC+5:30)
 *      * Returns formatted string: "DD/MM/YYYY HH:MM"
 * 
 * 3. AUTO-FILLS THE FIELD:
 *    - The captured IST time is automatically filled into the input field
 *    - This happens INSTANTLY when the icon is clicked
 *    - The time reflects the EXACT moment the icon was clicked
 * 
 * EXAMPLE:
 * - User clicks Start Time icon at 3:15 PM IST → Field shows "29/01/2026 15:15"
 * - User clicks End Time icon at 4:30 PM IST → Field shows "29/01/2026 16:30"
 * 
 * TIMEZONE HANDLING:
 * - The time is ALWAYS in IST, regardless of user's device timezone
 * - If user is in a different timezone, the system automatically converts to IST
 * - This ensures consistent time recording across all users
 * 
 * MANUAL INPUT:
 * - Users can also manually type the date/time in DD/MM/YYYY HH:MM format
 * - The clock icon is a convenience feature for quick time capture
 */
const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  onTimeCapture,
  placeholder = "DD/MM/YYYY HH:MM",
  error,
  className = "",
  showPauseButton = false,
  isPaused = false,
  onPauseToggle,
  disabled = false,
}) => {
  /**
   * Handles the clock icon click event
   * Captures the current IST time at the moment of click and fills the input field
   */
  const handleIconClick = () => {
    if (disabled) return; // Don't allow changes if disabled
    const captureTimestamp = Date.now();
    const currentISTTime = getCurrentISTDateTime(captureTimestamp);
    onChange(currentISTTime);
    // Notify parent that time was captured (for timer start)
    if (onTimeCapture) {
      onTimeCapture(captureTimestamp);
    }
  };

  const handlePauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPauseToggle) {
      onPauseToggle();
    }
  };

  return (
    <div className={`datetime-input-wrapper ${className}`}>
      <div className={`datetime-input-container ${showPauseButton && value ? "has-pause-button" : ""}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => !disabled && onChange(e.target.value)}
          placeholder={placeholder}
          className={`datetime-input ${error ? "input-error" : ""} ${disabled ? "disabled" : ""}`}
          disabled={disabled}
          readOnly={disabled}
        />
        {showPauseButton && value && (
          <button
            type="button"
            className="datetime-pause-button"
            onClick={handlePauseClick}
            aria-label={isPaused ? "Resume timer" : "Pause timer"}
            title={isPaused ? "Resume timer" : "Pause timer"}
          >
            {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
          </button>
        )}
        <button
          type="button"
          className="datetime-icon-button"
          onClick={handleIconClick}
          disabled={disabled}
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
