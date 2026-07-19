import { apiGet } from "./client";
import { HealthResponse } from "@/types/api";

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}
