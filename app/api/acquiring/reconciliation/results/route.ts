import { NextRequest, NextResponse } from "next/server";

const API = process.env.API_URL;
const PATH =
  process.env.ACQUIRING_RECONCILIATION_RESULTS_PATH ??
  "/api/Acquiring/GetReconciliationResults";

export async function POST(request: NextRequest) {
  try {
    if (!API) {
      return NextResponse.json({ message: "API_URL is not configured." }, { status: 500 });
    }

    const payload = await request.json();
    const response = await fetch(`${API}${PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await response.text();

    if (!body.trim()) {
      return NextResponse.json(
        { message: "The acquiring results service returned an empty response." },
        { status: response.ok ? 502 : response.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(body) as unknown, { status: response.status });
    } catch {
      return NextResponse.json(
        { message: response.ok ? "The acquiring results service returned invalid JSON." : body },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch (error) {
    console.error("Acquiring results fetch failed", error);
    return NextResponse.json({ message: "Unable to load acquiring results." }, { status: 502 });
  }
}
