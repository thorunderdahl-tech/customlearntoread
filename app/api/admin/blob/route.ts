import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const runtime = "nodejs";

// Issues short-lived client-upload tokens for the admin Deliver page.
// Auth is enforced by middleware (/api/admin/*).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^books\/[a-z0-9-]{4,80}\.(html|pdf)$/.test(pathname)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ["text/html", "application/pdf"],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 120 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do server-side; the page confirms delivery explicitly.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
