import { useRef } from "react";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { getServerNowMs } from "../../../services/serverTime";
import { getCurrentISTDateTime } from "../../../utils/dateTime";
import "./DateTimeInput.css";

type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onTimeCapture?: (timestampMs: number) => void; // Callback when time is captured via icon click
  placeholder?: string;
  error?: string;
  className?: string;
  showPauseButton?: boolean; // Show idle button for Start Time
  showPauseButtonInInput?: boolean;
  isPaused?: boolean; // Current idle state
  onPauseToggle?: () => void; // Callback for idle/resume
  disabled?: boolean; // Disable input (for End Time after first click)
  disablePauseButton?: boolean;
  applyCapturedValue?: boolean;
  allowManualInput?: boolean; // Allow manual text typing & calendar picking in input field (Admin only)
};

const formatToDatetimeLocal = (formattedStr: string): string => {
  if (!formattedStr) return "";
  const match = formattedStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return "";
  const [, dd, mm, yyyy, hh, min] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const formatFromDatetimeLocal = (pickerValue: string): string => {
  if (!pickerValue) return "";
  const [datePart, timePart] = pickerValue.split("T");
  if (!datePart || !timePart) return "";
  const [yyyy, mm, dd] = datePart.split("-");
  const [hh, min] = timePart.split(":");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:00`;
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
 * 3. CALENDAR PICKER FOR ADMIN (📅):
 *    - Admins can click the calendar button to visually pick any date & time.
 * 
 * 4. MANUAL INPUT:
 *    - Manual input (typing/picking custom time) is enabled for Admins (allowManualInput=true).
 *    - Operators click the clock icon for automatic IST time capture.
 */
const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  onTimeCapture,
  placeholder = "DD/MM/YYYY HH:MM:SS",
  error,
  className = "",
  showPauseButton = false,
  showPauseButtonInInput = true,
  isPaused = false,
  onPauseToggle,
  disabled = false,
  disablePauseButton = false,
  applyCapturedValue = true,
  allowManualInput = false,
}) => {
  const isReadOnly = disabled || !allowManualInput;
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the clock icon click event
   * Captures the current IST time at the moment of click and fills the input field
   */
  const handleIconClick = () => {
    if (disabled) return; // Don't allow changes if disabled
    const captureTimestamp = getServerNowMs();
    const currentISTTime = getCurrentISTDateTime(captureTimestamp);
    if (applyCapturedValue) {
      onChange(currentISTTime);
    }
    // Notify parent that time was captured (for timer start)
    if (onTimeCapture) {
      onTimeCapture(captureTimestamp);
    }
  };

  const handlePauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disablePauseButton) return;
    if (onPauseToggle) {
      onPauseToggle();
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatFromDatetimeLocal(e.target.value);
    if (formatted) {
      onChange(formatted);
      if (onTimeCapture) {
        const [dPart, tPart] = formatted.split(" ");
        const [dd, mm, yyyy] = dPart.split("/");
        const [hh, mi, ss] = tPart.split(":");
        const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss || 0));
        if (!Number.isNaN(dateObj.getTime())) {
          onTimeCapture(dateObj.getTime());
        }
      }
    }
  };

  const handleCalendarClick = () => {
    if (disabled) return;
    if (hiddenPickerRef.current) {
      try {
        if ("showPicker" in hiddenPickerRef.current) {
          (hiddenPickerRef.current as any).showPicker();
        } else {
          (hiddenPickerRef.current as HTMLInputElement).click();
        }
      } catch {
        (hiddenPickerRef.current as HTMLInputElement).click();
      }
    }
  };

  return (
    <div className={`datetime-input-wrapper ${className}`}>
      <div className="datetime-input-container">
        <input
          type="text"
          value={value}
          onChange={(e) => !isReadOnly && onChange(e.target.value)}
          placeholder={placeholder}
          className={`datetime-input ${error ? "input-error" : ""} ${disabled ? "disabled" : ""} ${isReadOnly ? "read-only" : ""} ${allowManualInput ? "has-admin-picker" : ""}`}
          disabled={disabled}
          readOnly={isReadOnly}
          title={value || placeholder}
        />
        <div className="datetime-input-actions">
          {allowManualInput && !disabled && (
            <>
              <input
                type="datetime-local"
                ref={hiddenPickerRef}
                value={formatToDatetimeLocal(value)}
                onChange={handlePickerChange}
                className="datetime-hidden-picker"
                tabIndex={-1}
              />
              <button
                type="button"
                className="datetime-action-btn datetime-calendar-btn"
                onClick={handleCalendarClick}
                title="Pick Date & Time from Calendar"
                aria-label="Pick Date and Time from Calendar"
              >
                <CalendarMonthIcon fontSize="small" />
              </button>
            </>
          )}
          {showPauseButton && showPauseButtonInInput && value && (
            <button
              type="button"
              className="datetime-action-btn datetime-pause-btn"
              onClick={handlePauseClick}
              disabled={disablePauseButton}
              aria-label={isPaused ? "Resume timer" : "Idle timer"}
              title={disablePauseButton ? "Idle disabled after end time is set" : (isPaused ? "Resume timer" : "Idle timer")}
            >
              {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
            </button>
          )}
          <button
            type="button"
            className="datetime-action-btn datetime-clock-btn"
            onClick={handleIconClick}
            disabled={disabled}
            aria-label="Fill current IST time"
            title="Fill current IST time"
          >
            <AccessTimeIcon fontSize="small" />
          </button>
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

export default DateTimeInput;
