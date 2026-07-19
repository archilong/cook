import { Family, FamilyCreate, FamilyJoin, FamilyMember, FamilyRecipe, FamilyUpdate } from "@/features/families/types";

import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export function listFamilies(): Promise<Family[]> {
  return apiGet<Family[]>("/families", { auth: true });
}

export function createFamily(request: FamilyCreate): Promise<Family> {
  return apiPost<Family>("/families", request, { auth: true });
}

export function joinFamily(request: FamilyJoin): Promise<Family> {
  return apiPost<Family>("/families/join", request, { auth: true });
}

export function getFamily(id: number): Promise<Family> {
  return apiGet<Family>(`/families/${id}`, { auth: true });
}

export function updateFamily(id: number, request: FamilyUpdate): Promise<Family> {
  return apiPatch<Family>(`/families/${id}`, request, { auth: true });
}

export function refreshInviteCode(id: number): Promise<Family> {
  return apiPost<Family>(`/families/${id}/invite-code/refresh`, undefined, { auth: true });
}

export function listFamilyMembers(familyId: number): Promise<FamilyMember[]> {
  return apiGet<FamilyMember[]>(`/families/${familyId}/members`, { auth: true });
}

export function removeFamilyMember(familyId: number, userId: number): Promise<void> {
  return apiDelete<void>(`/families/${familyId}/members/${userId}`, { auth: true });
}

export function listFamilyRecipes(familyId: number): Promise<FamilyRecipe[]> {
  return apiGet<FamilyRecipe[]>(`/families/${familyId}/recipes`, { auth: true });
}

export function shareRecipeToFamily(familyId: number, recipeId: number): Promise<FamilyRecipe> {
  return apiPost<FamilyRecipe>(`/families/${familyId}/recipes`, { recipe_id: recipeId }, { auth: true });
}

export function removeFamilyRecipe(familyId: number, recipeId: number): Promise<void> {
  return apiDelete<void>(`/families/${familyId}/recipes/${recipeId}`, { auth: true });
}
