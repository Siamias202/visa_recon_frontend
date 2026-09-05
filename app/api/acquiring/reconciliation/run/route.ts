import { NextResponse } from "next/server";

const API = process.env.API_URL;
const PATH =
  process.env.ACQUIRING_RECONCILIATION_RUN_PATH ??
  "/api/Acquiring/RunReconciliation";

export async function POST() {
  try {
    if (!API) {
      return NextResponse.json(
        { message: "API_URL is not configured." },
        { status: 500 },
      );
    }

    const response = await fetch(`${API}${PATH}`, {
      method: "POST",
      cache: "no-store",
    });
    const body = await response.text();

    if (!body.trim()) {
      return NextResponse.json(
        { message: "The acquiring reconciliation service returned an empty response." },
        { status: response.ok ? 502 : response.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(body) as unknown, {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        { message: response.ok ? "The acquiring reconciliation service returned invalid JSON." : body },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch (error) {
    console.error("Acquiring reconciliation run failed", error);
    return NextResponse.json(
      { message: "Unable to run acquiring reconciliation." },
      { status: 502 },
    );
  }
}
