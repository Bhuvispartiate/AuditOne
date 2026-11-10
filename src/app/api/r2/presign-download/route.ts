import { NextRequest, NextResponse } from "next/server";
import { generatePresignedDownloadUrl } from "@/lib/r2/client";

export async function POST(req: NextRequest) {
  try {
    const { objectKey, fileName } = await req.json();

    if (!objectKey) {
      return NextResponse.json({ error: "objectKey is required" }, { status: 400 });
    }

    const downloadUrl = await generatePresignedDownloadUrl(objectKey, fileName);
    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error("Presign download error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate download URL" }, { status: 500 });
  }
}

