import { useState, useRef, useEffect } from "react";

interface PassAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const DEFAULT_PASS_OPTIONS = ["1", "2", "3", "4", "5", "6"];

const PassAutocomplete: React.FC<PassAutocompleteProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  error,
}) => {
  const sourceOptions = options && options.length > 0 ? options : DEFAULT_PASS_OPTIONS;
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(sourceOptions);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    setFilteredOptions(sourceOptions);
  }, [sourceOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.trim() === "") {
      setFilteredOptions(sourceOptions);
    } else {
      setFilteredOptions(
        sourceOptions.filter((option) =>
          option.toLowerCase().includes(newValue.toLowerCase())
        )
      );
    }

    setIsOpen(true);
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    onChange(newValue);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    if (inputValue.trim() === "") {
      setFilteredOptions(sourceOptions);
    }
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!isOpen) {
        setIsOpen(true);
      }
      if (filteredOptions.length === 0) return;
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        highlightedIndex < 0
          ? 0
          : (highlightedIndex + delta + filteredOptions.length) % filteredOptions.length;
      setHighlightedIndex(nextIndex);
      const nextOption = filteredOptions[nextIndex];
      if (nextOption) {
        setInputValue(nextOption);
        onChange(nextOption);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    } else if (e.key === "Enter" && filteredOptions.length > 0 && isOpen) {
      e.preventDefault();
      handleOptionSelect(filteredOptions[Math.max(0, highlightedIndex)] || filteredOptions[0]);
    }
  };

  return (
    <div className="customer-autocomplete-wrapper" ref={wrapperRef}>
      <div className={`customer-autocomplete ${error ? "error" : ""} ${disabled ? "disabled" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          required={required}
          placeholder="Select or type pass..."
          className="customer-autocomplete-input"
        />
        <span className="customer-autocomplete-arrow">{"\u25BE"}</span>
      </div>
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="customer-autocomplete-dropdown">
          {filteredOptions.map((option) => (
            <div
              key={option}
              className={`customer-autocomplete-option ${
                option === value || highlightedIndex === filteredOptions.indexOf(option) ? "selected" : ""
              }`}
              onClick={() => handleOptionSelect(option)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PassAutocomplete;
