import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { loadAppearancePreferences, updateAppearanceImage } from "./appearanceStorage";
import { AppearanceImageSlot, AppearancePreferences, defaultAppearancePreferences } from "./types";

type AppearanceContextValue = {
  preferences: AppearancePreferences;
  isLoading: boolean;
  setImage: (slot: AppearanceImageSlot, uri: string | null) => Promise<void>;
  resetImage: (slot: AppearanceImageSlot) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<AppearancePreferences>(defaultAppearancePreferences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadAppearancePreferences()
      .then((loaded) => {
        if (mounted) {
          setPreferences(loaded);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setImage = useCallback(async (slot: AppearanceImageSlot, uri: string | null) => {
    const next = await updateAppearanceImage(slot, uri);
    setPreferences(next);
  }, []);

  const resetImage = useCallback(async (slot: AppearanceImageSlot) => {
    const next = await updateAppearanceImage(slot, null);
    setPreferences(next);
  }, []);

  const value = useMemo<AppearanceContextValue>(() => ({ preferences, isLoading, setImage, resetImage }), [isLoading, preferences, resetImage, setImage]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearance must be used inside AppearanceProvider");
  }
  return value;
}
