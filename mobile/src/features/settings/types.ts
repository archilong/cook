export type UserSettings = {
  theme_mode: "light" | "dark";
  primary_color: string;
  default_reminder_minutes: number;
  notifications_enabled: boolean;
};

export type UserSettingsUpdate = Partial<UserSettings>;
