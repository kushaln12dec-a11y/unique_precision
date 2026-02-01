import { useState, useRef, useEffect } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import dayjs, { Dayjs } from "dayjs";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Parse value to dayjs
  let parsedValue: Dayjs | null = null;
  if (value) {
    // Try DD/MM/YYYY HH:mm format first
    parsedValue = dayjs(value, "DD/MM/YYYY HH:mm", true);
    if (!parsedValue.isValid()) {
      // Try legacy HH:mm format
      const today = dayjs();
      const timeParts = value.split(":");
      if (timeParts.length === 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          parsedValue = today.hour(hours).minute(minutes).second(0).millisecond(0);
        }
      }
    }
  }
  const dayjsValue = parsedValue?.isValid() ? parsedValue : dayjs();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on MUI picker elements - don't close if it is
      if (
        target.closest(".MuiPickersPopper-root") ||
        target.closest(".MuiPaper-root") ||
        target.closest(".MuiPickersLayout-root") ||
        target.closest(".MuiPickersCalendarHeader-root") ||
        target.closest(".MuiDayCalendar-root") ||
        target.closest(".MuiTimeClock-root") ||
        target.closest(".MuiPickersArrowSwitcher-root") ||
        target.closest(".MuiPickersToolbar-root") ||
        target.closest(".MuiPickersToolbarButton-root")
      ) {
        return; // Don't close if clicking inside picker
      }

      // Close if clicking outside the container
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    // Add delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  const handleChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      onChange(newValue.format("DD/MM/YYYY HH:mm"));
    } else {
      onChange("");
    }
    setIsOpen(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div ref={containerRef} className={`datetime-input-wrapper ${className}`}>
        <div ref={anchorRef} className="datetime-input-container">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`datetime-input ${error ? "input-error" : ""}`}
            readOnly
          />
          <button
            type="button"
            className="datetime-icon-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            aria-label="Select date and time"
          >
            <AccessTimeIcon fontSize="small" />
          </button>
        </div>
        {isOpen && anchorRef.current && (
          <DateTimePicker
            value={dayjsValue}
            onChange={handleChange}
            open={isOpen}
            onClose={() => setIsOpen(false)}
            slotProps={{
              textField: {
                sx: { display: "none" },
              },
              popper: {
                anchorEl: anchorRef.current,
                placement: "bottom-start",
                disablePortal: false,
                style: { zIndex: 10000 },
              },
              layout: {
                sx: {
                  "& .MuiPickersLayout-root": {
                    zIndex: 10000,
                  },
                },
              },
            }}
            views={["year", "month", "day", "hours", "minutes"]}
            format="DD/MM/YYYY HH:mm"
          />
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
    </LocalizationProvider>
  );
};

export default DateTimeInput;
