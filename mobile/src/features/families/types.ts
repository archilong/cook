import { RecipeRead } from "@/features/recipes/types";

export type FamilyRole = "admin" | "member";

export type Family = {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number;
  avatar_image_id: number | null;
  cover_image_id: number | null;
  invite_code: string | null;
  role: FamilyRole;
  member_count: number;
  recipe_count: number;
  created_at: string;
  updated_at: string;
};

export type FamilyCreate = {
  name: string;
  description: string | null;
};

export type FamilyUpdate = Partial<FamilyCreate>;

export type FamilyJoin = {
  invite_code: string;
};

export type FamilyMember = {
  id: number;
  user_id: number;
  nickname: string;
  avatar_image_id: number | null;
  role: FamilyRole;
  joined_at: string;
};

export type FamilyRecipe = {
  id: number;
  family_id: number;
  recipe_id: number;
  shared_by_user_id: number;
  shared_by_nickname: string;
  recipe: RecipeRead;
  created_at: string;
};
