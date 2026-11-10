import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET = process.env.R2_BUCKET_NAME || "pms-documents";

const isR2Configured = Boolean(
  accountId &&
  accessKeyId &&
  secretAccessKey &&
  !accessKeyId.includes("placeholder")
);

// S3 Client configured for Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Generates a presigned upload URL for Cloudflare R2
 */
export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; objectKey: string; isSimulated?: boolean }> {
  if (!isR2Configured) {
    // Return safe development upload endpoint
    return {
      uploadUrl: `/api/r2/mock-upload?key=${encodeURIComponent(objectKey)}`,
      objectKey,
      isSimulated: true,
    };
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });

  return { uploadUrl, objectKey };
}

/**
 * Generates a secure presigned download URL for Cloudflare R2
 */
export async function generatePresignedDownloadUrl(
  objectKey: string,
  fileName?: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!isR2Configured) {
    // Return development preview/mock URL
    return `/api/r2/mock-download?key=${encodeURIComponent(objectKey)}&name=${encodeURIComponent(fileName || "document")}`;
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ResponseContentDisposition: fileName
      ? `inline; filename="${fileName}"`
      : undefined,
  });

  return await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });
}

/**
 * Deletes an object from Cloudflare R2
 */
export async function deleteR2Object(objectKey: string): Promise<boolean> {
  if (!isR2Configured) return true;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("Failed to delete R2 object:", error);
    return false;
  }
}

