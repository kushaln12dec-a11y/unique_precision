import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import "./SelectDropdown.css";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectDropdownProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "center";
  className?: string;
};

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select",
  disabled = false,
  align = "center",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const updateMenuPosition = () => {
    if (!wrapperRef.current) return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const viewportMargin = 8;
    const desiredWidth = Math.max(triggerRect.width, 1);
    const maxAllowedWidth = Math.max(desiredWidth, viewportWidth - viewportMargin * 2);
    const finalWidth = Math.min(desiredWidth, maxAllowedWidth);
    const menuMaxHeight = Math.min(220, Math.max(120, viewportHeight - viewportMargin * 2));

    const estimatedMenuHeight = Math.min((options.length || 1) * 40 + 12, menuMaxHeight);
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin;
    const showAbove = spaceBelow < estimatedMenuHeight && triggerRect.top > estimatedMenuHeight;

    let left = triggerRect.left;
    if (left + finalWidth > viewportWidth - viewportMargin) {
      left = viewportWidth - finalWidth - viewportMargin;
    }
    if (left < viewportMargin) {
      left = viewportMargin;
    }

    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      width: `${finalWidth}px`,
      maxHeight: `${menuMaxHeight}px`,
      zIndex: 2147483000,
      overflowY: "auto",
      overflowX: "hidden",
      ...(showAbove
        ? { bottom: `${viewportHeight - triggerRect.top + 4}px`, top: "auto" }
        : { top: `${triggerRect.bottom + 4}px`, bottom: "auto" }),
    });
  };

  useEffect(() => {
    const handleOutsideDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = wrapperRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      if (isOpen) updateMenuPosition();
    };

    if (isOpen) {
      updateMenuPosition();
      document.addEventListener("mousedown", handleOutsideDown);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    const handleOtherDropdownOpened = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== dropdownId) {
        setIsOpen(false);
      }
    };

    window.addEventListener("app-select-dropdown-opened", handleOtherDropdownOpened);
    return () => window.removeEventListener("app-select-dropdown-opened", handleOtherDropdownOpened);
  }, [dropdownId]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const handleWrapperBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (!nextFocused) {
      return;
    }
    const insideTrigger = wrapperRef.current?.contains(nextFocused);
    const insideMenu = menuRef.current?.contains(nextFocused);
    if (!insideTrigger && !insideMenu) {
      setIsOpen(false);
    }
  };

  const menu = isOpen && !disabled
    ? createPortal(
        <div className="option-dropdown-menu" style={menuStyle} ref={menuRef}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`option-dropdown-item ${option.value === value ? "selected" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                handleSelect(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        className={`option-dropdown-wrapper align-${align} ${className}`.trim()}
        ref={wrapperRef}
        onBlur={handleWrapperBlur}
      >
        <button
          type="button"
          className="option-dropdown-trigger"
          onClick={(event) => {
            event.stopPropagation();
            if (disabled) return;
            const nextOpen = !isOpen;
            if (nextOpen) {
              window.dispatchEvent(
                new CustomEvent("app-select-dropdown-opened", { detail: dropdownId })
              );
            }
            setIsOpen(nextOpen);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Tab") {
              setIsOpen(false);
              return;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const currentIndex = options.findIndex((option) => option.value === value);
              if (options.length === 0) return;

              const nextIndex =
                event.key === "ArrowDown"
                  ? (currentIndex + 1 + options.length) % options.length
                  : (currentIndex - 1 + options.length) % options.length;

              onChange(options[nextIndex].value);
              setIsOpen(true);
              return;
            }

            if ((event.key === "Enter" || event.key === " ") && !disabled) {
              event.preventDefault();
              const nextOpen = !isOpen;
              if (nextOpen) {
                window.dispatchEvent(
                  new CustomEvent("app-select-dropdown-opened", { detail: dropdownId })
                );
              }
              setIsOpen(nextOpen);
            }
          }}
          disabled={disabled}
          aria-expanded={isOpen}
        >
          <span className={`option-dropdown-value ${selectedOption ? "" : "placeholder"}`}>
            {selectedOption?.label || placeholder}
          </span>
          <span className={`option-dropdown-arrow ${isOpen ? "open" : ""}`}>v</span>
        </button>
      </div>
      {menu}
    </>
  );
};

export default SelectDropdown;
