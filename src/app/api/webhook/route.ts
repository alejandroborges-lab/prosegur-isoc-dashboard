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
      resolved: body.resolved === true || body.resolved === "true",
      escalated_to_human: body.escalated_to_human === true || body.escalated_to_human === "true",
      sentiment: body.sentiment || "neutral",
      duration_seconds: Number(body.duration_seconds) || 0,
      transcript_summary: body.transcript_summary || "",
      evalink_actions: Array.isArray(body.evalink_actions) ? body.evalink_actions : typeof body.evalink_actions === "string" ? JSON.parse(body.evalink_actions) : [],
      workflow_run_id: body.workflow_run_id || body.run_id || "",
      latency_ms: Number(body.latency_ms) || 0,
      zone: body.zone || "Sin zona",
      alarm_type: body.alarm_type || null,
    };
    addCall(call);
    return NextResponse.json({ ok: true, id: call.id });
  } catch (e) {
    console.error("/api/webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
