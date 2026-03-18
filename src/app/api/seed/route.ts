import { NextResponse } from "next/server";
import { addCall, getCalls } from "@/lib/store";
import { generateInitialData } from "@/lib/mock-data";

export async function POST() {
  if (getCalls().length > 0) {
    return NextResponse.json({ message: "Already seeded", count: getCalls().length });
  }

  const mockCalls = generateInitialData(64);
  mockCalls.reverse().forEach((call) => addCall(call));

  return NextResponse.json({ message: "Seeded", count: mockCalls.length });
}
