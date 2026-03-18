"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CallEvent, DashboardStats } from "@/lib/types";

export function useLiveCalls() {
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<Date | null>(null);
  const retriesRef = useRef(0);

  const computeStats = useCallback((allCalls: CallEvent[]): DashboardStats => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCalls = allCalls.filter((c) => new Date(c.timestamp) >= todayStart);
    const total = todayCalls.length || 1;

    const resolved = todayCalls.filter((c) => c.resolved && !c.escalated_to_human).length;
    const identified = todayCalls.filter((c) => c.identified).length;
    const escalated = todayCalls.filter((c) => c.escalated_to_human).length;
    const avgDuration = todayCalls.reduce((s, c) => s + c.duration_seconds, 0) / total;

    const byIntent = { tecnica: 0, operativa: 0, otra: 0 };
    const bySentiment = { positivo: 0, neutral: 0, negativo: 0 };
    todayCalls.forEach((c) => { byIntent[c.intent]++; bySentiment[c.sentiment]++; });

    const hourMap: Record<string, number> = {};
    for (let h = 0; h < 24; h++) hourMap[`${h.toString().padStart(2, "0")}:00`] = 0;
    todayCalls.forEach((c) => {
      const h = new Date(c.timestamp).getHours();
      hourMap[`${h.toString().padStart(2, "0")}:00`]++;
    });

    return {
      total_calls_today: todayCalls.length,
      auto_resolved_pct: Math.round((resolved / total) * 100),
      avg_duration_seconds: Math.round(avgDuration),
      auto_identified_pct: Math.round((identified / total) * 100),
      escalated_pct: Math.round((escalated / total) * 100),
      calls_by_intent: byIntent,
      sentiment_breakdown: bySentiment,
      calls_per_hour: Object.entries(hourMap).map(([hour, count]) => ({ hour, count })),
    };
  }, []);

  useEffect(() => {
    fetch("/api/seed", { method: "POST" })
      .then(() => fetch("/api/calls"))
      .then((r) => r.json())
      .then((data) => {
        setCalls(data.calls);
        setStats(computeStats(data.calls));
      })
      .catch(() => {});

    const connect = () => {
      const es = new EventSource("/api/events");
      es.onopen = () => { setConnected(true); retriesRef.current = 0; };
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "new_call") {
            setCalls((prev) => {
              const next = [payload.call, ...prev].slice(0, 200);
              setStats(computeStats(next));
              return next;
            });
            setLastEvent(new Date());
          }
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
        retriesRef.current++;
        setTimeout(connect, delay);
      };
      return es;
    };

    const es = connect();
    return () => { es.close(); setConnected(false); };
  }, [computeStats]);

  return { calls, stats, connected, lastEvent };
}
