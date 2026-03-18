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
  const avgDuration = todayCalls.reduce((s, c) => s + c.duration_seconds, 0) / total;
  const avgLatency = todayCalls.reduce((s, c) => s + (c.latency_ms || 0), 0) / total;

  const byIntent = { tecnica: 0, operativa: 0, otra: 0 };
  const bySentiment = { positivo: 0, neutral: 0, negativo: 0 };
  todayCalls.forEach((c) => { byIntent[c.intent]++; bySentiment[c.sentiment]++; });

  // Calls per hour with resolved/escalated breakdown
  const hourMap: Record<string, { count: number; resolved: number; escalated: number }> = {};
  for (let h = 0; h < 24; h++) {
    hourMap[`${h.toString().padStart(2, "0")}:00`] = { count: 0, resolved: 0, escalated: 0 };
  }
  todayCalls.forEach((c) => {
    const h = new Date(c.timestamp).getHours();
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourMap[key].count++;
    if (c.resolved) hourMap[key].resolved++;
    if (c.escalated_to_human) hourMap[key].escalated++;
  });

  // Resolution funnel
  const resolutionFunnel = [
    { stage: "Llamadas recibidas", count: todayCalls.length },
    { stage: "Identificadas", count: identified },
    { stage: "IA resolvió", count: resolved },
    { stage: "Escaladas", count: escalated },
  ];

  // Top Evalink actions
  const actionCount: Record<string, number> = {};
  todayCalls.forEach((c) => c.evalink_actions.forEach((a) => { actionCount[a] = (actionCount[a] || 0) + 1; }));
  const topActions = Object.entries(actionCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([action, count]) => ({ action, count }));

  // Zones
  const zoneMap: Record<string, { calls: number; resolved: number }> = {};
  todayCalls.forEach((c) => {
    if (!zoneMap[c.zone]) zoneMap[c.zone] = { calls: 0, resolved: 0 };
    zoneMap[c.zone].calls++;
    if (c.resolved) zoneMap[c.zone].resolved++;
  });
  const zones = Object.entries(zoneMap)
    .map(([zone, d]) => ({ zone, ...d }))
    .sort((a, b) => b.calls - a.calls);

  // Alarm types
  const alarmMap: Record<string, number> = {};
  todayCalls.forEach((c) => {
    if (c.alarm_type) alarmMap[c.alarm_type] = (alarmMap[c.alarm_type] || 0) + 1;
  });
  const alarmTypes = Object.entries(alarmMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Avg duration by intent
  const intentDurations: Record<string, number[]> = { tecnica: [], operativa: [], otra: [] };
  todayCalls.forEach((c) => intentDurations[c.intent].push(c.duration_seconds));
  const avgDurationByIntent = Object.entries(intentDurations).map(([intent, durations]) => ({
    intent,
    avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
  }));

  return {
    total_calls_today: todayCalls.length,
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
    zones,
    alarm_types: alarmTypes,
    avg_duration_by_intent: avgDurationByIntent,
  };
}
