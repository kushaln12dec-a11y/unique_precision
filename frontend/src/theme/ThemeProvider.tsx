import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.body.dataset.theme = "light";
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      setTheme: setThemeState, // No-op visually now
      toggleTheme: () => {}, // No-op
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
