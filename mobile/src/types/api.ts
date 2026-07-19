export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export type HealthResponse = {
  status: string;
  app_name: string;
  environment: string;
};
