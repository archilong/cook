import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import { RecipeCreate, RecipeRead, RecipeUpdate } from "@/features/recipes/types";

export function listRecipes(): Promise<RecipeRead[]> {
  return apiGet<RecipeRead[]>("/recipes", { auth: true });
}

export function getRecipe(id: number): Promise<RecipeRead> {
  return apiGet<RecipeRead>(`/recipes/${id}`, { auth: true });
}

export function createRecipe(request: RecipeCreate): Promise<RecipeRead> {
  return apiPost<RecipeRead>("/recipes", request, { auth: true });
}

export function updateRecipe(id: number, request: RecipeUpdate): Promise<RecipeRead> {
  return apiPatch<RecipeRead>(`/recipes/${id}`, request, { auth: true });
}

export function deleteRecipe(id: number): Promise<void> {
  return apiDelete<void>(`/recipes/${id}`, { auth: true });
}
