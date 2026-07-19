export type User = {
  id: number;
  email: string | null;
  phone: string | null;
  nickname: string;
  avatar_image_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type RegisterRequest = {
  email?: string | null;
  phone?: string | null;
  password: string;
  nickname: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type UserUpdate = {
  nickname?: string;
  avatar_image_id?: number | null;
};

export type PasswordUpdateRequest = {
  current_password: string;
  new_password: string;
};
