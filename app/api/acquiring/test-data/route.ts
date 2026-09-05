import { NextResponse } from "next/server";

const API = process.env.API_URL;
const PATH =
  process.env.ACQUIRING_TEST_DATA_DELETE_PATH ??
  "/api/TestData/DeleteAcquiringData";

export async function DELETE() {
  try {
    if (!API) {
      return NextResponse.json(
        { message: "API_URL is not configured." },
        { status: 500 },
      );
    }

    const response = await fetch(`${API}${PATH}`, {
      method: "DELETE",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirm: true }),
      cache: "no-store",
    });
    const body = await response.text();

    if (!body.trim()) {
      return NextResponse.json(
        {
          message: response.ok
            ? "Acquiring test data deleted successfully."
            : "The acquiring delete service returned an empty response.",
        },
        { status: response.ok ? 200 : response.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(body) as unknown, {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        { message: body },
        { status: response.status },
      );
    }
  } catch (error) {
    console.error("Acquiring test data deletion failed", error);
    return NextResponse.json(
      { message: "Unable to delete acquiring test data." },
      { status: 502 },
    );
  }
}
