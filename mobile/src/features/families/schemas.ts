import { z } from "zod";

import { FamilyCreate, FamilyJoin } from "./types";

export const familyFormSchema = z.object({
  name: z.string().trim().min(1, "请输入家庭名称").max(120, "家庭名称不能超过 120 个字符"),
  description: z.string().trim().optional()
});

export type FamilyFormValues = z.infer<typeof familyFormSchema>;

export function emptyFamilyForm(): FamilyFormValues {
  return { name: "", description: "" };
}

export function familyCreateFromForm(values: FamilyFormValues): FamilyCreate {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ? values.description.trim() : null
  };
}

export const joinFamilySchema = z.object({
  invite_code: z.string().trim().min(1, "请输入邀请码").max(32, "邀请码不能超过 32 个字符")
});

export type JoinFamilyFormValues = z.infer<typeof joinFamilySchema>;

export function joinFamilyFromForm(values: JoinFamilyFormValues): FamilyJoin {
  return { invite_code: values.invite_code.trim().toUpperCase() };
}
