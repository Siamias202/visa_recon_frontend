import { NextRequest, NextResponse } from "next/server";

const API = process.env.API_URL;

const previewPaths = {
  cbs: process.env.ISSUING_CBS_PREVIEW_PATH ?? "/api/GL/GetGLTransactionDetails",
  bo: process.env.ISSUING_BO_PREVIEW_PATH ?? "/api/BO/GetBOTransactionsList",
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!API) {
      return NextResponse.json({ message: "API_URL is not configured." }, { status: 500 });
    }

    const type = request.nextUrl.searchParams.get("type");
    if (type !== "cbs" && type !== "bo") {
      return NextResponse.json({ message: "Preview type must be cbs or bo." }, { status: 400 });
    }

    const requestBody = await request.text();
    if (!requestBody.trim()) {
      return NextResponse.json({ message: "Preview request body is empty." }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(requestBody);
    } catch {
      return NextResponse.json({ message: "Preview request body is not valid JSON." }, { status: 400 });
    }

    const response = await fetch(`${API}${previewPaths[type]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

    let result: unknown;
    try {
      result = JSON.parse(responseBody);
    } catch {
      return NextResponse.json(
        {
          message: `The ${type.toUpperCase()} service returned invalid JSON.`,
          upstreamStatus: response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(result, {
      status: response.status,
    });
  } catch (error) {
    console.error("Issuing preview failed", error);

    return NextResponse.json(
      { message: "Preview fetch failed." },
      { status: 500 },
    );
  }
}
