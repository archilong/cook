export type ImageRead = {
  id: number;
  storage_provider: string;
  object_key: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  purpose: string;
  created_at: string;
};

export type RecipeStepRead = {
  id: number;
  step_no: number;
  instruction: string;
  image_id: number | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeStepCreate = {
  step_no: number;
  instruction: string;
  image_id: number | null;
  estimated_minutes: number | null;
};

export type RecipeRead = {
  id: number;
  title: string;
  creator_name: string;
  description: string | null;
  main_image_id: number | null;
  main_image: ImageRead | null;
  tags: string[];
  steps: RecipeStepRead[];
  created_at: string;
  updated_at: string;
};

export type RecipeCreate = {
  title: string;
  creator_name: string;
  description: string | null;
  main_image_id: number | null;
  tags: string[];
  steps: RecipeStepCreate[];
};

export type RecipeUpdate = Partial<RecipeCreate>;
