export type MealSlot =
  | "breakfast"
  | "morning_tea"
  | "lunch"
  | "afternoon_tea"
  | "dinner"
  | "late_night_snack";

export type CookingOrderStatus = "pending_acceptance" | "accepted" | "completed" | "cancelled";

export type CookingOrder = {
  id: number;
  family_id: number;
  recipe_id: number;
  recipe_title_snapshot: string;
  recipe_image_snapshot_url: string | null;
  requester_user_id: number;
  requester_nickname: string;
  assignee_user_id: number;
  assignee_nickname: string;
  is_requester: boolean;
  is_assignee: boolean;
  meal_slot: MealSlot;
  scheduled_date: string;
  scheduled_time: string | null;
  note: string | null;
  status: CookingOrderStatus;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
};

export type CookingOrderCreate = {
  recipe_id: number;
  assignee_user_id: number;
  meal_slot: MealSlot;
  scheduled_date: string;
  scheduled_time: string | null;
  note: string | null;
  reminder_time: string | null;
};

export type CookingOrderCancel = {
  cancel_reason: string | null;
};

export type CookingOrderReminderUpdate = {
  reminder_time: string | null;
};
