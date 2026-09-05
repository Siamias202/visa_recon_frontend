import { NextRequest, NextResponse } from "next/server";

const API = process.env.API_URL;

const previewPaths = {
  gl:
    process.env.ACQUIRING_GL_PREVIEW_PATH ??
    "/api/Acquiring/GetGLTransactionDetails",
  fe:
    process.env.ACQUIRING_FE_PREVIEW_PATH ??
    "/api/Acquiring/GetFETransactionDetails",
  ep:
    process.env.ACQUIRING_EP_PREVIEW_PATH ??
    "/api/Acquiring/GetEPTransactionDetails",
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
        { message: "Preview type must be gl, fe, or ep." },
        { status: 400 },
      );
    }

    const requestBody = await request.text();
    if (!requestBody.trim()) {
      return NextResponse.json(
        { message: "Preview request body is empty." },
        { status: 400 },
      );
    }

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(requestBody) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("The request body must be an object.");
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { message: "Preview request body must be a valid JSON object." },
        { status: 400 },
      );
    }

    const response = await fetch(`${API}${previewPaths[type]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page: payload.page,
        pageSize: payload.pageSize,
        searchQuery: payload.searchQuery,
      }),
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (!responseBody.trim()) {
      return NextResponse.json(
        {
          message: `The ${type.toUpperCase()} service returned an empty response.`,
          upstreamStatus: response.status,
        },
        { status: response.ok ? 502 : response.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseBody) as unknown, {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        {
          message: `The ${type.toUpperCase()} service returned invalid JSON.`,
          upstreamStatus: response.status,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Acquiring preview failed", error);
    return NextResponse.json(
      { message: "Preview fetch failed." },
      { status: 500 },
    );
  }
}
