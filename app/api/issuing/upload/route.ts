import { NextRequest, NextResponse } from "next/server";
const API = process.env.API_URL;

const uploadPaths = {
  cbs: process.env.ISSUING_CBS_UPLOAD_PATH ?? "/api/GL/uploadGLFiles",
  bo: process.env.ISSUING_BO_UPLOAD_PATH ?? "/api/BO/uploadBOFiles",
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!API) {
      return NextResponse.json({ message: "API_URL is not configured." }, { status: 500 });
    }

    const type = request.nextUrl.searchParams.get("type");
    if (type !== "cbs" && type !== "bo") {
      return NextResponse.json({ message: "Upload type must be cbs or bo." }, { status: 400 });
    }

    const formData = await request.formData();
    const response = await fetch(`${API}${uploadPaths[type]}`, {
      method: "POST",
      body: formData,
    });

    const text = await response.text();
    const result = text ? safelyParseJson(text) : { message: response.statusText };

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Issuing upload failed", error);
    return NextResponse.json({ message: "Upload failed." }, { status: 502 });
  }
}

function safelyParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return { message: value };
  }
}
