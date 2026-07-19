import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("请输入有效邮箱").optional().or(z.literal("")),
    phone: z.string().min(3, "手机号至少 3 位").optional().or(z.literal("")),
    nickname: z.string().min(1, "请输入昵称").max(80, "昵称不能超过 80 个字符"),
    password: z.string().min(6, "密码至少 6 位").max(128, "密码不能超过 128 位"),
    confirmPassword: z.string().min(1, "请再次输入密码")
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "邮箱或手机号至少填写一个",
    path: ["email"]
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  identifier: z.string().min(3, "请输入邮箱或手机号"),
  password: z.string().min(1, "请输入密码")
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
