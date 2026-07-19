import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

import { UserSettings } from "@/features/settings/types";

import { AppTheme, buildAppTheme, lightTheme, ThemeMode } from "./theme";

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  primaryColor: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (primaryColor: string) => void;
  applySettingsTheme: (settings: Pick<UserSettings, "theme_mode" | "primary_color">) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [primaryColor, setPrimaryColor] = useState(lightTheme.primaryColor);

  const applySettingsTheme = useCallback((settings: Pick<UserSettings, "theme_mode" | "primary_color">) => {
    setMode(settings.theme_mode);
    setPrimaryColor(settings.primary_color);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      primaryColor,
      setMode,
      setPrimaryColor,
      applySettingsTheme,
      theme: buildAppTheme(mode, primaryColor)
    };
  }, [applySettingsTheme, mode, primaryColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }
  return value;
}
