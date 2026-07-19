import { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

import { ApiError, apiBaseUrl } from "./client";
import { ImageRead } from "@/features/recipes/types";
import { getAccessToken } from "@/storage/tokenStorage";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadImageInput =
  | string
  | {
      uri: string;
      fileName?: string | null;
      mimeType?: string | null;
    };

function imageInputFromAsset(asset: ImagePickerAsset): UploadImageInput {
  return {
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType
  };
}

function filenameFromUri(uri: string): string {
  const pathPart = uri.split("?")[0] ?? uri;
  return pathPart.split("/").pop() || "recipe-image.jpg";
}

function mimeTypeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return null;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

type NormalizedUploadFile = {
  uri: string;
  name: string;
  type: string;
};

function normalizeUploadInput(input: UploadImageInput): NormalizedUploadFile {
  const uri = typeof input === "string" ? input : input.uri;
  const providedName = typeof input === "string" ? undefined : input.fileName;
  const inferredName = providedName || filenameFromUri(uri);
  const mimeType = (typeof input === "string" ? undefined : input.mimeType) || mimeTypeFromFilename(inferredName);

  if (!mimeType || !SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new ApiError("请选择 JPEG、PNG 或 WebP 格式的图片。", 400);
  }

  const hasSupportedExtension = mimeTypeFromFilename(inferredName) !== null;
  const name = hasSupportedExtension ? inferredName : `recipe-image${extensionFromMimeType(mimeType)}`;
  return { uri, name, type: mimeType };
}

async function appendUploadFile(formData: FormData, file: NormalizedUploadFile): Promise<void> {
  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append("file", new File([blob], file.name, { type: file.type }));
    return;
  }

  formData.append("file", file as unknown as Blob);
}

export async function uploadImage(input: UploadImageInput, purpose = "recipe_main"): Promise<ImageRead> {
  const token = await getAccessToken();
  const file = normalizeUploadInput(input);
  const formData = new FormData();
  formData.append("purpose", purpose);
  await appendUploadFile(formData, file);

  const response = await fetch(`${apiBaseUrl}/uploads/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `Image upload failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as ImageRead;
}

export function uploadImagePickerAsset(asset: ImagePickerAsset, purpose = "recipe_main"): Promise<ImageRead> {
  return uploadImage(imageInputFromAsset(asset), purpose);
}
