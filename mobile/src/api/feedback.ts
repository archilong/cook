import { apiPost } from "./client";

export type FeedbackCreate = {
  content: string;
  contact_email?: string;
};

export type FeedbackSubmitResult = {
  message: string;
};

export function submitFeedback(request: FeedbackCreate): Promise<FeedbackSubmitResult> {
  return apiPost<FeedbackSubmitResult>("/feedback", request);
}
