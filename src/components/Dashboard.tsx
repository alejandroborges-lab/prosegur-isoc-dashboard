"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useLiveCalls } from "@/hooks/use-live-calls";
import { CallEvent, DashboardStats } from "@/lib/types";

// ─── Utils ────────────────────────────────────────────────────────
function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "ahora";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

const INTENT_COLORS: Record<string, string> = { tecnica: "#60a5fa", operativa: "#fbbf24", otra: "#71717a" };
const SENT_COLORS: Record<string, string> = { positivo: "#34d399", neutral: "#a1a1aa", negativo: "#f87171" };
const CHART_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb923c", "#38bdf8"];

function intentLabel(i: string) { return i === "tecnica" ? "Técnica" : i === "operativa" ? "Operativa" : "Otra"; }

// ─── Shared components ────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ color: "#71717a", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: 3, background: p.color }} />
          <span style={{ color: "#a1a1aa" }}>{p.name}:</span>
          <span style={{ color: "#fafafa", fontWeight: 500 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.15em] mb-3" style={{ color: "#52525b" }}>{children}</div>;
}

function MetricCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div style={{ padding: "16px 20px", background: "#111113", borderRadius: 12, border: "1px solid #1e1e22" }}>
      <div className="text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: "#52525b" }}>{label}</div>
      <div className="text-[32px] font-extralight tracking-tight leading-none" style={{ color: accent || "#fafafa" }}>{value}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: "#3f3f46" }}>{sub}</div>}
    </div>
  );
}

// ─── Call Row ──────────────────────────────────────────────────────
function CallRow({ call, onClick, isSelected }: { call: CallEvent; onClick: () => void; isSelected: boolean }) {
  return (
    <motion.div
      layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      onClick={onClick} className="cursor-pointer"
      style={{ padding: "11px 20px", borderBottom: "1px solid #141416", background: isSelected ? "#1a1a1e" : "transparent", transition: "background 0.15s" }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#111113"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center shrink-0"
          style={{ width: 28, height: 28, borderRadius: 7, background: `${INTENT_COLORS[call.intent]}15`, color: INTENT_COLORS[call.intent], fontSize: 11, fontWeight: 600 }}>
          {call.intent[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate">{call.caller_name || call.caller_phone}</span>
            {call.identified && <span className="text-[9px] px-1 py-[1px] rounded" style={{ background: "#34d39915", color: "#34d399" }}>ID</span>}
            {call.escalated_to_human && <span className="text-[9px] px-1 py-[1px] rounded" style={{ background: "#f8717115", color: "#f87171" }}>ESC</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] truncate" style={{ color: "#52525b" }}>{call.intent_detail}</span>
            {call.zone && <span className="text-[10px]" style={{ color: "#3f3f46" }}>{call.zone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div style={{ width: 5, height: 5, borderRadius: 3, background: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" }} />
          <span className="text-[11px] tabular-nums" style={{ color: "#3f3f46" }}>{fmt(call.duration_seconds)}</span>
          <span className="text-[10px] tabular-nums" style={{ color: "#27272a" }}>{timeAgo(call.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Call Detail Panel ────────────────────────────────────────────
function CallDetail({ call, onClose }: { call: CallEvent; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      className="h-full overflow-y-auto" style={{ borderLeft: "1px solid #1e1e22" }}>
      <div className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e22" }}>
        <div>
          <div className="text-[14px] font-medium">{call.caller_name || "No identificado"}</div>
          <div className="text-[11px] font-mono" style={{ color: "#52525b" }}>{call.caller_phone}</div>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, background: "#1f1f23", color: "#52525b", border: "none", cursor: "pointer", fontSize: 13 }}>&times;</button>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ padding: "16px 20px" }}>
        {[
          { l: "Estado", v: call.resolved ? "Resuelto por IA" : call.escalated_to_human ? "Escalado a humano" : "Pendiente",
            c: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" },
          { l: "Duración", v: fmt(call.duration_seconds) },
          { l: "Intención", v: intentLabel(call.intent), c: INTENT_COLORS[call.intent] },
          { l: "Sentimiento", v: call.sentiment, c: SENT_COLORS[call.sentiment] },
          { l: "Zona", v: call.zone },
          { l: "Latencia IA", v: `${call.latency_ms}ms`, c: call.latency_ms > 2000 ? "#f87171" : "#a1a1aa" },
          ...(call.subscriber_id ? [{ l: "Abonado", v: call.subscriber_id, c: "#818cf8" }] : []),
          ...(call.alarm_type ? [{ l: "Tipo alarma", v: call.alarm_type }] : []),
        ].map((item, i) => (
          <div key={i}>
            <div className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: "#3f3f46" }}>{item.l}</div>
            <div className="text-[12px]" style={{ color: item.c || "#a1a1aa" }}>{item.v}</div>
          </div>
        ))}
      </div>

      {call.evalink_actions.length > 0 && (
        <div style={{ padding: "0 20px 14px" }}>
          <div className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: "#3f3f46" }}>Pipeline Evalink</div>
          <div className="flex items-center gap-1 flex-wrap">
            {call.evalink_actions.map((a, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#818cf815", color: "#818cf8" }}>
                  {a.split(".")[1]}
                </span>
                {i < call.evalink_actions.length - 1 && <span style={{ color: "#27272a", fontSize: 10 }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "0 20px 14px" }}>
        <div className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: "#3f3f46" }}>Resumen de la conversación</div>
        <p className="text-[12px] leading-[1.6]" style={{ color: "#71717a" }}>{call.transcript_summary}</p>
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <div className="text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: "#27272a" }}>Run ID</div>
        <div className="text-[10px] font-mono" style={{ color: "#27272a" }}>{call.workflow_run_id}</div>
      </div>
    </motion.div>
  );
}

// ─── Analytics View ───────────────────────────────────────────────
function AnalyticsView({ stats }: { stats: DashboardStats }) {
  const hourlyData = stats.calls_per_hour.filter((_, i) => i >= 6 && i <= 22);
  const intentData = Object.entries(stats.calls_by_intent).map(([k, v]) => ({ name: intentLabel(k), value: v, fill: INTENT_COLORS[k] }));
  const sentimentData = Object.entries(stats.sentiment_breakdown).map(([k, v]) => ({ name: k, value: v, fill: SENT_COLORS[k] }));

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
      {/* KPI row */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <MetricCard label="Llamadas hoy" value={stats.total_calls_today} />
        <MetricCard label="Resolución IA" value={`${stats.auto_resolved_pct}%`} accent="#34d399" sub="sin intervención humana" />
        <MetricCard label="Identificación auto." value={`${stats.auto_identified_pct}%`} accent="#818cf8" sub="por número de teléfono" />
        <MetricCard label="Duración media" value={fmt(stats.avg_duration_seconds)} sub="por llamada" />
        <MetricCard label="Escaladas" value={`${stats.escalated_pct}%`} accent={stats.escalated_pct > 20 ? "#f87171" : "#a1a1aa"} sub="derivadas a operador" />
        <MetricCard label="Latencia IA" value={`${(stats.avg_latency_ms / 1000).toFixed(1)}s`} accent={stats.avg_latency_ms > 2000 ? "#fbbf24" : "#a1a1aa"} sub="tiempo de respuesta" />
      </div>

      {/* Row 2: Activity + Funnel */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Hourly activity */}
        <div className="col-span-2" style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Actividad por hora — resueltas vs escaladas</SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEscalated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#3f3f46", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#3f3f46", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="resolved" name="Resueltas" stroke="#34d399" fill="url(#gResolved)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="escalated" name="Escaladas" stroke="#f87171" fill="url(#gEscalated)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution funnel */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Embudo de resolución</SectionLabel>
          <div className="flex flex-col gap-2 mt-2">
            {stats.resolution_funnel.map((step, i) => {
              const maxCount = stats.resolution_funnel[0].count || 1;
              const pct = Math.round((step.count / maxCount) * 100);
              const colors = ["#818cf8", "#60a5fa", "#34d399", "#f87171"];
              return (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{step.stage}</span>
                    <span className="text-[11px] font-mono tabular-nums" style={{ color: "#52525b" }}>{step.count}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "#1e1e22" }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      style={{ height: 4, borderRadius: 2, background: colors[i] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Intent + Sentiment + Alarm types */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Intent distribution */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Distribución por intención</SectionLabel>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={intentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                {intentData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {intentData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: 2, background: d.fill }} />
                <span className="text-[10px]" style={{ color: "#71717a" }}>{d.name} {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Sentimiento del llamante</SectionLabel>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                {sentimentData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {sentimentData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: 3, background: d.fill }} />
                <span className="text-[10px]" style={{ color: "#71717a" }}>{d.name} {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alarm types */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Tipos de alarma</SectionLabel>
          {stats.alarm_types.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1">
              {stats.alarm_types.slice(0, 6).map((at, i) => {
                const maxC = stats.alarm_types[0].count || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{at.type}</span>
                      <span className="text-[11px] tabular-nums font-mono" style={{ color: "#52525b" }}>{at.count}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "#1e1e22" }}>
                      <div style={{ height: 3, borderRadius: 2, width: `${(at.count / maxC) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] mt-4" style={{ color: "#3f3f46" }}>Sin datos de alarma</div>
          )}
        </div>
      </div>

      {/* Row 4: Zones + Top Evalink Actions + Duration by intent */}
      <div className="grid grid-cols-3 gap-3">
        {/* Zone performance */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Rendimiento por zona</SectionLabel>
          <div className="flex flex-col gap-2.5 mt-1">
            {stats.zones.slice(0, 8).map((z, i) => {
              const pctResolved = z.calls > 0 ? Math.round((z.resolved / z.calls) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] truncate flex-1" style={{ color: "#a1a1aa" }}>{z.zone}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] tabular-nums" style={{ color: "#52525b" }}>{z.calls} llamadas</span>
                    <span className="text-[10px] tabular-nums px-1 py-0.5 rounded"
                      style={{ background: pctResolved >= 80 ? "#34d39910" : pctResolved >= 50 ? "#fbbf2410" : "#f8717110",
                               color: pctResolved >= 80 ? "#34d399" : pctResolved >= 50 ? "#fbbf24" : "#f87171" }}>
                      {pctResolved}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Evalink actions */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Acciones Evalink más usadas</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.top_actions.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="action" width={120} tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false} tickLine={false} tickFormatter={(v: string) => v.split(".")[1] || v} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {stats.top_actions.slice(0, 6).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.7} />)}
              </Bar>
              <Tooltip content={<ChartTooltip />} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Duration by intent */}
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SectionLabel>Duración media por tipo</SectionLabel>
          <div className="flex flex-col gap-4 mt-3">
            {stats.avg_duration_by_intent.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: `${INTENT_COLORS[d.intent]}12`, color: INTENT_COLORS[d.intent], fontSize: 11, fontWeight: 600 }}>
                  {d.intent[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[11px]" style={{ color: "#a1a1aa" }}>{intentLabel(d.intent)}</div>
                  <div className="text-[18px] font-light tabular-nums" style={{ color: INTENT_COLORS[d.intent] }}>{fmt(d.avg)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const { calls, stats, connected } = useLiveCalls();
  const [selectedCall, setSelectedCall] = useState<CallEvent | null>(null);
  const [view, setView] = useState<"actividad" | "analisis">("actividad");
  const [filter, setFilter] = useState<"all" | "tecnica" | "operativa" | "escalated">("all");

  const filteredCalls = calls.filter((c) => {
    if (filter === "tecnica") return c.intent === "tecnica";
    if (filter === "operativa") return c.intent === "operativa";
    if (filter === "escalated") return c.escalated_to_human;
    return true;
  });

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <header className="flex items-center justify-between shrink-0" style={{ height: 48, padding: "0 20px", borderBottom: "1px solid #1e1e22" }}>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold tracking-tight">PROSEGUR</span>
          <div style={{ width: 1, height: 14, background: "#27272a" }} />
          <span className="text-[13px] font-semibold" style={{ color: "#818cf8" }}>iSOC</span>
          <div style={{ width: 1, height: 14, background: "#27272a" }} />

          {/* View switcher */}
          <div className="flex items-center gap-0.5 ml-2" style={{ background: "#111113", borderRadius: 6, padding: 2 }}>
            {(["actividad", "analisis"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  padding: "3px 10px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer",
                  background: view === v ? "#1f1f23" : "transparent",
                  color: view === v ? "#fafafa" : "#52525b", transition: "all 0.15s",
                }}>
                {v === "actividad" ? "Actividad" : "Análisis"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-4 mr-3">
              <span className="text-[11px] tabular-nums" style={{ color: "#52525b" }}>
                <span style={{ color: "#fafafa", fontWeight: 500 }}>{stats.total_calls_today}</span> llamadas
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: "#34d399" }}>{stats.auto_resolved_pct}% auto</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div style={{
              width: 6, height: 6, borderRadius: 3,
              background: connected ? "#34d399" : "#f87171",
              animation: connected ? "live-pulse 2s ease-in-out infinite" : "none",
            }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: connected ? "#34d399" : "#f87171" }}>
              {connected ? "Live" : "..."}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "#1e1e22" }} />
          <span className="text-[10px]" style={{ color: "#27272a" }}>Powered by HappyRobot</span>
        </div>
      </header>

      {/* ── Content ── */}
      {view === "analisis" && stats ? (
        <AnalyticsView stats={stats} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Feed */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Quick stats bar */}
            {stats && (
              <div className="shrink-0 flex items-center gap-6" style={{ padding: "12px 20px", borderBottom: "1px solid #111113" }}>
                {[
                  { l: "Resolución IA", v: `${stats.auto_resolved_pct}%`, c: "#34d399" },
                  { l: "Identificación", v: `${stats.auto_identified_pct}%`, c: "#818cf8" },
                  { l: "Duración media", v: fmt(stats.avg_duration_seconds) },
                  { l: "Escaladas", v: `${stats.escalated_pct}%`, c: stats.escalated_pct > 20 ? "#f87171" : "#52525b" },
                  { l: "Latencia IA", v: `${(stats.avg_latency_ms / 1000).toFixed(1)}s` },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: "#3f3f46" }}>{s.l}</span>
                    <span className="text-[12px] font-medium tabular-nums" style={{ color: s.c || "#71717a" }}>{s.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-1 shrink-0" style={{ padding: "10px 20px 0" }}>
              {([ { key: "all", label: "Todas" }, { key: "tecnica", label: "Técnica" }, { key: "operativa", label: "Operativa" }, { key: "escalated", label: "Escaladas" } ] as const).map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{ padding: "4px 10px", borderRadius: 5, border: "none", fontSize: 11, cursor: "pointer",
                    background: filter === f.key ? "#1f1f23" : "transparent", color: filter === f.key ? "#fafafa" : "#3f3f46", transition: "all 0.15s" }}>
                  {f.label}
                </button>
              ))}
              <span className="text-[10px] ml-2 tabular-nums" style={{ color: "#27272a" }}>{filteredCalls.length} resultados</span>
            </div>

            {/* Call list */}
            <div className="flex-1 overflow-y-auto" style={{ marginTop: 6 }}>
              <AnimatePresence initial={false}>
                {filteredCalls.map((call) => (
                  <CallRow key={call.id} call={call} onClick={() => setSelectedCall(call)} isSelected={selectedCall?.id === call.id} />
                ))}
              </AnimatePresence>
              {filteredCalls.length === 0 && (
                <div className="flex items-center justify-center" style={{ padding: 80 }}>
                  <span className="text-[12px]" style={{ color: "#27272a" }}>Sin llamadas</span>
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedCall && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }} className="shrink-0 overflow-hidden" style={{ background: "#0c0c0e" }}>
                <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
