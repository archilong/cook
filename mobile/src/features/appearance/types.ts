export type AppearanceImageSlot =
  | "globalBackgroundImageUri"
  | "familyCoverImageUri"
  | "personalAvatarImageUri"
  | "familyAvatarImageUri"
  | "tabRecipesIconUri"
  | "tabFamilyIconUri"
  | "tabTasksIconUri"
  | "tabSettingsIconUri"
  | "emptyStateImageUri";

export type AppearancePreferences = Record<AppearanceImageSlot, string | null>;

export const defaultAppearancePreferences: AppearancePreferences = {
  globalBackgroundImageUri: null,
  familyCoverImageUri: null,
  personalAvatarImageUri: null,
  familyAvatarImageUri: null,
  tabRecipesIconUri: null,
  tabFamilyIconUri: null,
  tabTasksIconUri: null,
  tabSettingsIconUri: null,
  emptyStateImageUri: null
};
