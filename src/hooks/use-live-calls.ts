"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CallEvent, DashboardStats } from "@/lib/types";

export function useLiveCalls() {
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<Date | null>(null);
  const retriesRef = useRef(0);

  const recomputeStats = useCallback((allCalls: CallEvent[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tc = allCalls.filter((c) => new Date(c.timestamp) >= todayStart);
    const total = tc.length || 1;

    const resolved = tc.filter((c) => c.resolved && !c.escalated_to_human).length;
    const identified = tc.filter((c) => c.identified).length;
    const escalated = tc.filter((c) => c.escalated_to_human).length;
    const avgDur = tc.reduce((s, c) => s + c.duration_seconds, 0) / total;
    const avgLat = tc.reduce((s, c) => s + (c.latency_ms || 0), 0) / total;

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

    const intentDur: Record<string, number[]> = { tecnica: [], operativa: [], otra: [] };
    tc.forEach((c) => intentDur[c.intent].push(c.duration_seconds));

    setStats({
      total_calls_today: tc.length,
      auto_resolved_pct: Math.round((resolved / total) * 100),
      avg_duration_seconds: Math.round(avgDur),
      auto_identified_pct: Math.round((identified / total) * 100),
      escalated_pct: Math.round((escalated / total) * 100),
      avg_latency_ms: Math.round(avgLat),
      calls_by_intent: byIntent,
      sentiment_breakdown: bySentiment,
      calls_per_hour: Object.entries(hourMap).map(([hour, d]) => ({ hour, ...d })),
      resolution_funnel: [
        { stage: "Llamadas recibidas", count: tc.length },
        { stage: "Cliente identificado", count: identified },
        { stage: "Resueltas por IA", count: resolved },
        { stage: "Derivadas a operador", count: escalated },
      ],
      top_actions: topActions,
      zones: Object.entries(zoneMap).map(([zone, d]) => ({ zone, ...d })).sort((a, b) => b.calls - a.calls),
      alarm_types: Object.entries(alarmMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      avg_duration_by_intent: Object.entries(intentDur).map(([intent, d]) => ({
        intent,
        avg: d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0,
      })),
    });
  }, []);

  useEffect(() => {
    // Load initial data from server (which auto-seeds)
    fetch("/api/calls")
      .then((r) => r.json())
      .then((data) => { setCalls(data.calls); recomputeStats(data.calls); })
      .catch(() => {});

    const connect = () => {
      const es = new EventSource("/api/events");
      es.onopen = () => { setConnected(true); retriesRef.current = 0; };
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "new_call") {
            setCalls((prev) => {
              const next = [payload.call, ...prev].slice(0, 300);
              recomputeStats(next);
              return next;
            });
            setLastEvent(new Date());
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setConnected(false); es.close();
        setTimeout(connect, Math.min(1000 * 2 ** retriesRef.current++, 30000));
      };
      return es;
    };

    const es = connect();
    return () => { es.close(); setConnected(false); };
  }, [recomputeStats]);

  return { calls, stats, connected, lastEvent };
}
