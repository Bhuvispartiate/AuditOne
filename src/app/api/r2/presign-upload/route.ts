import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/r2/client";

export async function POST(req: NextRequest) {
  try {
    const { fileName, category, entityType, entityId, contentType } = await req.json();

    if (!fileName || !category) {
      return NextResponse.json(
        { error: "fileName and category are required" },
        { status: 400 }
      );
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `${category.toLowerCase()}/${entityId || "common"}/${Date.now()}_${sanitizedFileName}`;

    const presigned = await generatePresignedUploadUrl(
      objectKey,
      contentType || "application/octet-stream"
    );

    return NextResponse.json({
      uploadUrl: presigned.uploadUrl,
      objectKey: presigned.objectKey,
      isSimulated: presigned.isSimulated || false,
    });
  } catch (error: any) {
    console.error("Presign upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate upload URL" }, { status: 500 });
  }
}

