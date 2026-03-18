import { CallEvent, DashboardStats } from "./types";

const calls: CallEvent[] = [];
const listeners: Set<(event: CallEvent) => void> = new Set();

export function addCall(call: CallEvent) {
  calls.unshift(call);
  if (calls.length > 500) calls.pop();
  listeners.forEach((fn) => fn(call));
}

export function getCalls(): CallEvent[] {
  return [...calls];
}

export function subscribe(fn: (event: CallEvent) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStats(): DashboardStats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCalls = calls.filter((c) => new Date(c.timestamp) >= todayStart);

  const total = todayCalls.length || 1;
  const resolved = todayCalls.filter((c) => c.resolved && !c.escalated_to_human).length;
  const identified = todayCalls.filter((c) => c.identified).length;
  const escalated = todayCalls.filter((c) => c.escalated_to_human).length;
  const avgDuration =
    todayCalls.reduce((sum, c) => sum + c.duration_seconds, 0) / total;

  const byIntent = { tecnica: 0, operativa: 0, otra: 0 };
  const bySentiment = { positivo: 0, neutral: 0, negativo: 0 };
  todayCalls.forEach((c) => {
    byIntent[c.intent]++;
    bySentiment[c.sentiment]++;
  });

  const hourMap: Record<string, number> = {};
  for (let h = 0; h < 24; h++) {
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourMap[key] = 0;
  }
  todayCalls.forEach((c) => {
    const h = new Date(c.timestamp).getHours();
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourMap[key]++;
  });

  return {
    total_calls_today: todayCalls.length,
    auto_resolved_pct: Math.round((resolved / total) * 100),
    avg_duration_seconds: Math.round(avgDuration),
    auto_identified_pct: Math.round((identified / total) * 100),
    escalated_pct: Math.round((escalated / total) * 100),
    calls_by_intent: byIntent,
    sentiment_breakdown: bySentiment,
    calls_per_hour: Object.entries(hourMap).map(([hour, count]) => ({
      hour,
      count,
    })),
  };
}
