// Client-side Cloudflare R2 Presign Helper
// Delegates presigned URL generation to a Supabase Edge Function when configured,
// and falls back safely to simulated local handling during development.

export const R2_BUCKET = "pms-documents";

const presignFunctionUrl = import.meta.env.VITE_R2_PRESIGN_FUNCTION_URL || "";

export interface PresignUploadResult {
  uploadUrl: string;
  objectKey: string;
  isSimulated?: boolean;
}

/**
 * Requests a presigned upload URL for Cloudflare R2 (via Edge Function or safe stub)
 */
export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType: string
): Promise<PresignUploadResult> {
  if (!presignFunctionUrl) {
    return {
      uploadUrl: `#simulated-r2-upload:${encodeURIComponent(objectKey)}`,
      objectKey,
      isSimulated: true,
    };
  }

  const response = await fetch(presignFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upload", objectKey, contentType, bucket: R2_BUCKET }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate R2 presigned upload URL from Edge Function");
  }

  return await response.json();
}

/**
 * Requests a presigned download URL for Cloudflare R2 (via Edge Function or safe stub)
 */
export async function generatePresignedDownloadUrl(
  objectKey: string,
  fileName?: string
): Promise<string> {
  if (!presignFunctionUrl) {
    return `#simulated-r2-download:${encodeURIComponent(objectKey)}:${encodeURIComponent(fileName || "document")}`;
  }

  const response = await fetch(presignFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "download", objectKey, fileName, bucket: R2_BUCKET }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate R2 presigned download URL from Edge Function");
  }

  const data = await response.json();
  return data.downloadUrl;
}

/**
 * Requests deletion of an object from Cloudflare R2 (via Edge Function or safe stub)
 */
export async function deleteR2Object(objectKey: string): Promise<boolean> {
  if (!presignFunctionUrl) return true;

  try {
    const response = await fetch(presignFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", objectKey, bucket: R2_BUCKET }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to delete R2 object:", error);
    return false;
  }
}
