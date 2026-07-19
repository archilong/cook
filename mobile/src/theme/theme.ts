export type ThemeMode = "light" | "dark";
export type CardStyle = "soft" | "flat";

export type AppTheme = {
  mode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  backgroundImageUrl: string | null;
  familySpaceCoverImageUrl: string | null;
  cardStyle: CardStyle;
  fontScale: number;
};

export const lightTheme: AppTheme = {
  mode: "light",
  primaryColor: "#F97316",
  backgroundColor: "#FFF7ED",
  surfaceColor: "#FFFFFF",
  textColor: "#1F2937",
  mutedTextColor: "#6B7280",
  borderColor: "#FED7AA",
  backgroundImageUrl: null,
  familySpaceCoverImageUrl: null,
  cardStyle: "soft",
  fontScale: 1
};

export const darkTheme: AppTheme = {
  mode: "dark",
  primaryColor: "#FB923C",
  backgroundColor: "#111827",
  surfaceColor: "#1F2937",
  textColor: "#F9FAFB",
  mutedTextColor: "#D1D5DB",
  borderColor: "#374151",
  backgroundImageUrl: null,
  familySpaceCoverImageUrl: null,
  cardStyle: "soft",
  fontScale: 1
};

export function buildAppTheme(mode: ThemeMode, primaryColor?: string): AppTheme {
  const baseTheme = mode === "dark" ? darkTheme : lightTheme;
  return {
    ...baseTheme,
    primaryColor: primaryColor || baseTheme.primaryColor
  };
}
