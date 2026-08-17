import { NextResponse } from "next/server";
import { checkHyperspaceHealth, HYPERSPACE_MODEL } from "@/lib/hyperspace";

export const runtime = "edge";

export async function GET() {
  const online = await checkHyperspaceHealth();
  return NextResponse.json(
    {
      ok: online,
      model: HYPERSPACE_MODEL.replace("anthropic--", ""),
      endpoint: process.env.HYPERSPACE_API_URL ?? "http://localhost:6655",
    },
    { status: online ? 200 : 503 }
  );
}
