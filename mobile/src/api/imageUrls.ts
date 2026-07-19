import { apiBaseUrl } from "./client";

const apiOrigin = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");

export function imageUrlFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) {
    return null;
  }
  if (publicUrl.startsWith("http://") || publicUrl.startsWith("https://")) {
    return publicUrl;
  }
  return `${apiOrigin}${publicUrl.startsWith("/") ? publicUrl : `/${publicUrl}`}`;
}
