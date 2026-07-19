import { z } from "zod";

import { RecipeCreate, RecipeStepCreate } from "./types";

export const recipeFormSchema = z.object({
  title: z.string().trim().min(1, "请输入菜谱名称").max(120, "菜谱名称不能超过 120 个字符"),
  creator_name: z.string().trim().min(1, "请输入作者").max(80, "作者不能超过 80 个字符"),
  description: z.string().trim().optional(),
  tags_text: z.string().trim().optional(),
  main_image_id: z.number().nullable(),
  steps: z.array(z.string().trim().min(1, "步骤不能为空")).min(1, "至少添加一个步骤")
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export function emptyRecipeForm(): RecipeFormValues {
  return {
    title: "",
    creator_name: "",
    description: "",
    tags_text: "",
    main_image_id: null,
    steps: [""]
  };
}

export function tagsFromText(tagsText: string | undefined): string[] {
  return (tagsText ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function stepsFromText(steps: string[]): RecipeStepCreate[] {
  return steps.map((instruction, index) => ({
    step_no: index + 1,
    instruction: instruction.trim(),
    image_id: null,
    estimated_minutes: null
  }));
}

export function recipeCreateFromForm(values: RecipeFormValues): RecipeCreate {
  return {
    title: values.title.trim(),
    creator_name: values.creator_name.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    main_image_id: values.main_image_id,
    tags: tagsFromText(values.tags_text),
    steps: stepsFromText(values.steps)
  };
}
