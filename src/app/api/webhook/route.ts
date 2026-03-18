import { NextRequest, NextResponse } from "next/server";
import { addCall } from "@/lib/store";
import { CallEvent } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const call: CallEvent = {
      id: body.id || crypto.randomUUID(),
      timestamp: body.timestamp || new Date().toISOString(),
      caller_phone: body.caller_phone || "desconocido",
      caller_name: body.caller_name || null,
      subscriber_id: body.subscriber_id || null,
      identified: body.identified ?? !!body.subscriber_id,
      intent: body.intent || "otra",
      intent_detail: body.intent_detail || body.intent || "Sin detalle",
      action_taken: body.action_taken || "",
      resolved: body.resolved ?? false,
      escalated_to_human: body.escalated_to_human ?? false,
      sentiment: body.sentiment || "neutral",
      duration_seconds: body.duration_seconds || 0,
      transcript_summary: body.transcript_summary || "",
      evalink_actions: body.evalink_actions || [],
      workflow_run_id: body.workflow_run_id || body.run_id || "",
      latency_ms: body.latency_ms || 0,
      zone: body.zone || "Sin zona",
      alarm_type: body.alarm_type || null,
    };

    addCall(call);

    return NextResponse.json({ ok: true, id: call.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
