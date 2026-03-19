import { subscribe, getCalls } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      try {
        const current = getCalls().slice(0, 5);
        if (current.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", calls: current })}\n\n`));
        }
      } catch { /* ignore init errors */ }

      const unsubscribe = subscribe((call) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "new_call", call })}\n\n`)); }
        catch { unsubscribe(); }
      });

      const interval = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)); }
        catch { clearInterval(interval); unsubscribe(); }
      }, 15000);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
