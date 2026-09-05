import { NextResponse } from "next/server";

const API = process.env.API_URL;
const RUN_MATCH_PATH =
  process.env.ISSUING_RUN_MATCH_PATH ?? "/api/Main/RunMatchAction";

export async function POST() {
  try {
    if (!API) {
      return NextResponse.json(
        { message: "API_URL is not configured." },
        { status: 500 },
      );
    }

    const response = await fetch(`${API}${RUN_MATCH_PATH}`, {
      method: "POST",
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (!responseBody.trim()) {
      return NextResponse.json(
        {
          message: "The reconciliation service returned an empty response.",
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
            ? "The reconciliation service returned invalid JSON."
            : responseBody,
          upstreamStatus: response.status,
        },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch (error) {
    console.error("Reconciliation run failed", error);
    return NextResponse.json(
      { message: "Unable to run reconciliation." },
      { status: 502 },
    );
  }
}
