import { NextResponse } from "next/server";
import { getCalls, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ calls: getCalls(), stats: getStats() });
  } catch (e) {
    console.error("/api/calls error:", e);
    return NextResponse.json({ calls: [], stats: null, error: String(e) });
  }
}
