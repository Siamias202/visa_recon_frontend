import { NextRequest, NextResponse } from "next/server";

const API = process.env.API_URL;

const uploadPaths = {
  gl:
    process.env.ACQUIRING_GL_UPLOAD_PATH ??
    "/api/Acquiring/uploadGLFiles",
  fe:
    process.env.ACQUIRING_FE_UPLOAD_PATH ??
    "/api/Acquiring/uploadFEFiles",
  ep:
    process.env.ACQUIRING_EP_UPLOAD_PATH ??
    "/api/Acquiring/uploadEPFiles",
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!API) {
      return NextResponse.json(
        { message: "API_URL is not configured." },
        { status: 500 },
      );
    }

    const type = request.nextUrl.searchParams.get("type");
    if (type !== "gl" && type !== "fe" && type !== "ep") {
      return NextResponse.json(
        { message: "Upload type must be gl, fe, or ep." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const response = await fetch(`${API}${uploadPaths[type]}`, {
      method: "POST",
      body: formData,
    });
    const responseBody = await response.text();
    const result = responseBody
      ? safelyParseJson(responseBody)
      : { message: response.statusText };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Acquiring upload failed", error);
    return NextResponse.json({ message: "Upload failed." }, { status: 502 });
  }
}

function safelyParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { message: value };
  }
}
