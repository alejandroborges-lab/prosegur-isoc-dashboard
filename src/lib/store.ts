import { CallEvent, DashboardStats } from "./types";
import { generateInitialData } from "./mock-data";

let _calls: CallEvent[] | undefined;

function init(): CallEvent[] {
  if (!_calls) _calls = generateInitialData(64);
  return _calls;
}

const listeners: Set<(event: CallEvent) => void> = new Set();

export function addCall(call: CallEvent) {
  const c = init();
  c.unshift(call);
  if (c.length > 500) c.pop();
  listeners.forEach((fn) => fn(call));
}

export function getCalls(): CallEvent[] {
  return [...init()];
}

export function subscribe(fn: (event: CallEvent) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getStats(): DashboardStats {
  const tc = init();
  const total = tc.length || 1;
  const resolved = tc.filter((c) => c.resolved && !c.escalated_to_human).length;
  const identified = tc.filter((c) => c.identified).length;
  const escalated = tc.filter((c) => c.escalated_to_human).length;
  const avgDuration = tc.reduce((s, c) => s + c.duration_seconds, 0) / total;
  const avgLatency = tc.reduce((s, c) => s + (c.latency_ms || 0), 0) / total;
  const byIntent = { tecnica: 0, operativa: 0, otra: 0 };
  const bySentiment = { positivo: 0, neutral: 0, negativo: 0 };
  tc.forEach((c) => { byIntent[c.intent]++; bySentiment[c.sentiment]++; });
  const hourMap: Record<string, { count: number; resolved: number; escalated: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[`${h.toString().padStart(2, "0")}:00`] = { count: 0, resolved: 0, escalated: 0 };
  tc.forEach((c) => { const k = `${new Date(c.timestamp).getHours().toString().padStart(2, "0")}:00`; hourMap[k].count++; if (c.resolved) hourMap[k].resolved++; if (c.escalated_to_human) hourMap[k].escalated++; });
  const actionCount: Record<string, number> = {};
  tc.forEach((c) => c.evalink_actions.forEach((a) => { actionCount[a] = (actionCount[a] || 0) + 1; }));
  const zoneMap: Record<string, { calls: number; resolved: number }> = {};
  tc.forEach((c) => { if (!zoneMap[c.zone]) zoneMap[c.zone] = { calls: 0, resolved: 0 }; zoneMap[c.zone].calls++; if (c.resolved) zoneMap[c.zone].resolved++; });
  const alarmMap: Record<string, number> = {};
  tc.forEach((c) => { if (c.alarm_type) alarmMap[c.alarm_type] = (alarmMap[c.alarm_type] || 0) + 1; });
  const intentDur: Record<string, number[]> = { tecnica: [], operativa: [], otra: [] };
  tc.forEach((c) => intentDur[c.intent].push(c.duration_seconds));
  return {
    total_calls_today: tc.length,
    auto_resolved_pct: Math.round((resolved / total) * 100),
    avg_duration_seconds: Math.round(avgDuration),
    auto_identified_pct: Math.round((identified / total) * 100),
    escalated_pct: Math.round((escalated / total) * 100),
    avg_latency_ms: Math.round(avgLatency),
    calls_by_intent: byIntent,
    sentiment_breakdown: bySentiment,
    calls_per_hour: Object.entries(hourMap).map(([hour, d]) => ({ hour, ...d })),
    resolution_funnel: [
      { stage: "Llamadas recibidas", count: tc.length },
      { stage: "Cliente identificado", count: identified },
      { stage: "Resueltas por IA", count: resolved },
      { stage: "Derivadas a operador", count: escalated },
    ],
    top_actions: Object.entries(actionCount).sort(([, a], [, b]) => b - a).slice(0, 8).map(([action, count]) => ({ action, count })),
    zones: Object.entries(zoneMap).map(([zone, d]) => ({ zone, ...d })).sort((a, b) => b.calls - a.calls),
    alarm_types: Object.entries(alarmMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    avg_duration_by_intent: Object.entries(intentDur).map(([intent, d]) => ({ intent, avg: d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0 })),
  };
}
