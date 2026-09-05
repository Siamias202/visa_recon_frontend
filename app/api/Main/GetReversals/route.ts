import { NextRequest, NextResponse } from "next/server";

const API = process.env.API_URL;
const REVERSALS_PATH =
  process.env.ISSUING_REVERSALS_PATH ?? "/api/Main/GetReversals";

export async function POST(request: NextRequest) {
  try {
    if (!API) {
      return NextResponse.json(
        { message: "API_URL is not configured." },
        { status: 500 },
      );
    }

    const requestBody = await request.text();
    if (!requestBody.trim()) {
      return NextResponse.json(
        { message: "Reversals request body is empty." },
        { status: 400 },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(requestBody) as unknown;
    } catch {
      return NextResponse.json(
        { message: "Reversals request body is not valid JSON." },
        { status: 400 },
      );
    }

    const response = await fetch(`${API}${REVERSALS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (!responseBody.trim()) {
      return NextResponse.json(
        {
          message: "The reversals service returned an empty response.",
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
          message: response.ok
            ? "The reversals service returned invalid JSON."
            : responseBody,
          upstreamStatus: response.status,
        },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch (error) {
    console.error("Reversals fetch failed", error);
    return NextResponse.json(
      { message: "Unable to load reversals." },
      { status: 502 },
    );
  }
}
