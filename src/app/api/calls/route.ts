import { NextResponse } from "next/server";
import { getCalls, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    calls: getCalls(),
    stats: getStats(),
  });
}
