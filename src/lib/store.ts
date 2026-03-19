import { CallEvent, DashboardStats } from "./types";
import { generateInitialData } from "./mock-data";

const calls: CallEvent[] = generateInitialData(64);
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
  const tc = calls;
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
  tc.forEach((c) => {
    const h = new Date(c.timestamp).getHours();
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourMap[key].count++;
    if (c.resolved) hourMap[key].resolved++;
    if (c.escalated_to_human) hourMap[key].escalated++;
  });

  const resolutionFunnel = [
    { stage: "Llamadas recibidas", count: tc.length },
    { stage: "Cliente identificado", count: identified },
    { stage: "Resueltas por IA", count: resolved },
    { stage: "Derivadas a operador", count: escalated },
  ];

  const actionCount: Record<string, number> = {};
  tc.forEach((c) => c.evalink_actions.forEach((a) => { actionCount[a] = (actionCount[a] || 0) + 1; }));
  const topActions = Object.entries(actionCount).sort(([, a], [, b]) => b - a).slice(0, 8).map(([action, count]) => ({ action, count }));

  const zoneMap: Record<string, { calls: number; resolved: number }> = {};
  tc.forEach((c) => {
    if (!zoneMap[c.zone]) zoneMap[c.zone] = { calls: 0, resolved: 0 };
    zoneMap[c.zone].calls++;
    if (c.resolved) zoneMap[c.zone].resolved++;
  });

  const alarmMap: Record<string, number> = {};
  tc.forEach((c) => { if (c.alarm_type) alarmMap[c.alarm_type] = (alarmMap[c.alarm_type] || 0) + 1; });

  const intentDurations: Record<string, number[]> = { tecnica: [], operativa: [], otra: [] };
  tc.forEach((c) => intentDurations[c.intent].push(c.duration_seconds));

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
    resolution_funnel: resolutionFunnel,
    top_actions: topActions,
    zones: Object.entries(zoneMap).map(([zone, d]) => ({ zone, ...d })).sort((a, b) => b.calls - a.calls),
    alarm_types: Object.entries(alarmMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    avg_duration_by_intent: Object.entries(intentDurations).map(([intent, durations]) => ({
      intent,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    })),
  };
}
