import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import type { PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import "./Header.css";

dayjs.extend(isBetween);

interface HeaderProps {
  title: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface DateRange {
  start: Dayjs | null;
  end: Dayjs | null;
}

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: dayjs(),
    end: dayjs().add(7, "day"),
  });
  const [tempDate, setTempDate] = useState<Dayjs | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Define breadcrumb paths
  const breadcrumbMap: { [key: string]: BreadcrumbItem[] } = {
    "/dashboard": [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon }
    ],
    "/users": [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "User Management", path: "/users", icon: PeopleIcon }
    ]
  };

  const breadcrumbs = breadcrumbMap[location.pathname] || breadcrumbMap["/dashboard"];

  const handleBreadcrumbClick = (path: string, isLast: boolean) => {
    if (!isLast) {
      navigate(path);
    }
  };

  const handleDateChange = (newDate: Dayjs | null) => {
    if (!newDate) return;

    if (!tempDate) {
      // First click - set temporary start date
      setTempDate(newDate);
      setDateRange({ start: newDate, end: null });
    } else {
      // Second click - set end date
      if (newDate.isBefore(tempDate)) {
        // If selected date is before start, swap them
        setDateRange({ start: newDate, end: tempDate });
      } else {
        setDateRange({ start: tempDate, end: newDate });
      }
      setTempDate(null);
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
    if (showCalendar) {
      setTempDate(null);
    }
  };

  const isInRange = (day: Dayjs) => {
    if (!dateRange.start || !dateRange.end) return false;
    return day.isBetween(dateRange.start, dateRange.end, "day", "[]");
  };

  const isRangeStart = (day: Dayjs) => {
    return dateRange.start && day.isSame(dateRange.start, "day");
  };

  const isRangeEnd = (day: Dayjs) => {
    return dateRange.end && day.isSame(dateRange.end, "day");
  };

  const CustomDay = (props: PickersDayProps) => {
    const { day, ...other } = props;
    const inRange = isInRange(day as Dayjs);
    const isStart = isRangeStart(day as Dayjs);
    const isEnd = isRangeEnd(day as Dayjs);

    return (
      <PickersDay
        {...other}
        day={day}
        sx={{
          ...(inRange && {
            backgroundColor: "rgba(26, 26, 46, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(26, 26, 46, 0.2)",
            },
          }),
          ...((isStart || isEnd) && {
            backgroundColor: "#1a1a2e !important",
            color: "#ffffff !important",
            "&:hover": {
              backgroundColor: "#16213e !important",
            },
          }),
        }}
      />
    );
  };

  const formatDateRange = () => {
    if (dateRange.start && dateRange.end) {
      return `${dateRange.start.format("DD MMM")} - ${dateRange.end.format("DD MMM YYYY")}`;
    }
    return dateRange.start?.format("DD MMM YYYY") || "Select Date Range";
  };

  return (
    <div className="page-header">
      <div className="header-left">
        <nav className="breadcrumb">
          {breadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbs.length - 1;
            
            return (
              <div key={item.path} className="breadcrumb-item-wrapper">
                <div
                  className={`breadcrumb-item ${isLast ? "active" : ""}`}
                  onClick={() => handleBreadcrumbClick(item.path, isLast)}
                  role={!isLast ? "button" : undefined}
                  tabIndex={!isLast ? 0 : undefined}
                >
                  <Icon className="breadcrumb-icon" />
                  <span className="breadcrumb-label">{item.label}</span>
                </div>
                {!isLast && (
                  <ChevronRightIcon className="breadcrumb-separator" />
                )}
              </div>
            );
          })}
        </nav>
      </div>
      
      <div className="header-right">
        <div className="calendar-container">
          <button className="calendar-button" onClick={toggleCalendar}>
            <CalendarMonthIcon />
            <span>{formatDateRange()}</span>
          </button>
          
          {showCalendar && (
            <>
              <div className="calendar-overlay" onClick={toggleCalendar} />
              <div className="calendar-dropdown">
                <div className="calendar-header-info">
                  {tempDate ? (
                    <p>Select end date</p>
                  ) : (
                    <p>Select start date</p>
                  )}
                </div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar
                    value={dateRange.start}
                    onChange={handleDateChange}
                    slots={{
                      day: CustomDay,
                    }}
                  />
                </LocalizationProvider>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
