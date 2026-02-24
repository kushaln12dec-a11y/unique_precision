import { useEffect, useMemo, useRef, useState } from "react";
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
};

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select",
  disabled = false,
  align = "center",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div className={`option-dropdown-wrapper align-${align}`} ref={wrapperRef}>
      <button
        type="button"
        className="option-dropdown-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className={`option-dropdown-value ${selectedOption ? "" : "placeholder"}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className={`option-dropdown-arrow ${isOpen ? "open" : ""}`}>▾</span>
      </button>
      {isOpen && !disabled && (
        <div className="option-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`option-dropdown-item ${option.value === value ? "selected" : ""}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
