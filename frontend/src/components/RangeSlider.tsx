import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "./RangeSlider.css";

type RangeSliderProps = {
  min: number;
  max: number;
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  step?: number;
  label?: string;
  unit?: string;
};

// Create a custom theme matching the app's color scheme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1a1a2e",
      light: "#16213e",
    },
  },
});

function valuetext(value: number, unit?: string) {
  return unit ? `${value}${unit}` : `${value}`;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  label,
  unit = "",
}) => {
  const minValue = value.min !== undefined ? value.min : min;
  const maxValue = value.max !== undefined ? value.max : max;

  const [sliderValue, setSliderValue] = React.useState<number[]>([
    minValue,
    maxValue,
  ]);

  React.useEffect(() => {
    setSliderValue([minValue, maxValue]);
  }, [minValue, maxValue]);

  const handleChange = (event: Event, newValue: number | number[]) => {
    const range = newValue as number[];
    setSliderValue(range);
    onChange({
      min: range[0] === min ? undefined : range[0],
      max: range[1] === max ? undefined : range[1],
    });
  };

  const getAriaLabel = () => {
    return label || "Range slider";
  };

  return (
    <div className="range-slider-container">
      {label && <label className="range-slider-label">{label}</label>}
      <ThemeProvider theme={theme}>
        <Box sx={{ width: "100%", px: 1 }}>
          <Slider
            getAriaLabel={getAriaLabel}
            value={sliderValue}
            onChange={handleChange}
            valueLabelDisplay="auto"
            getAriaValueText={(val) => valuetext(val, unit)}
            min={min}
            max={max}
            step={step}
            valueLabelFormat={(val) => valuetext(val, unit)}
            sx={{
              color: "#1a1a2e",
              "& .MuiSlider-thumb": {
                backgroundColor: "#1a1a2e",
                border: "2px solid #ffffff",
                width: 20,
                height: 20,
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(26, 26, 46, 0.4)",
                },
                "&:active": {
                  boxShadow: "0 6px 16px rgba(26, 26, 46, 0.5)",
                },
              },
              "& .MuiSlider-track": {
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                border: "none",
                height: 4,
              },
              "& .MuiSlider-rail": {
                backgroundColor: "#e2e8f0",
                opacity: 1,
                height: 4,
              },
              "& .MuiSlider-valueLabel": {
                backgroundColor: "#1a1a2e",
                color: "#ffffff",
                fontSize: "0.75rem",
              },
            }}
          />
        </Box>
      </ThemeProvider>
      <div className="range-slider-values">
        <div className="range-value">
          <span className="range-value-label">Min:</span>
          <input
            type="number"
            min={min}
            max={max}
            value={minValue === min ? "" : minValue}
            onChange={(e) => {
              let val = e.target.value === "" ? min : Number(e.target.value);
              val = Math.max(min, Math.min(val, maxValue));
              onChange({
                min: val === min ? undefined : val,
                max: value.max,
              });
            }}
            placeholder={min.toString()}
            className="range-value-input"
          />
          {unit && <span className="range-unit">{unit}</span>}
        </div>
        <div className="range-value">
          <span className="range-value-label">Max:</span>
          <input
            type="number"
            min={min}
            max={max}
            value={maxValue === max ? "" : maxValue}
            onChange={(e) => {
              let val = e.target.value === "" ? max : Number(e.target.value);
              val = Math.min(max, Math.max(val, minValue));
              onChange({
                min: value.min,
                max: val === max ? undefined : val,
              });
            }}
            placeholder={max.toString()}
            className="range-value-input"
          />
          {unit && <span className="range-unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;
