"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useLiveCalls } from "@/hooks/use-live-calls";
import { CallEvent, DashboardStats } from "@/lib/types";

// ─── Friendly labels ──────────────────────────────────────────────
function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "ahora";
  if (d < 3600) return `hace ${Math.floor(d / 60)} min`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)}h`;
  return `hace ${Math.floor(d / 86400)}d`;
}

function intentName(i: string) {
  if (i === "tecnica") return "Soporte técnico";
  if (i === "operativa") return "Gestión de cuenta";
  return "Consulta general";
}

function intentEmoji(i: string) {
  if (i === "tecnica") return "\u{1F527}";
  if (i === "operativa") return "\u{1F464}";
  return "\u{1F4AC}";
}

const ACTION_LABELS: Record<string, string> = {
  "evalink.get_events": "Consultar eventos",
  "evalink.get_subscriber": "Buscar abonado",
  "evalink.check_cctv_status": "Verificar cámaras",
  "evalink.get_panel_schedule": "Ver programación",
  "evalink.set_test_mode": "Modo pruebas",
  "evalink.get_zone_status": "Estado de zona",
  "evalink.check_comm_status": "Diagnóstico conexión",
  "evalink.reset_sensor": "Resetear sensor",
  "evalink.lookup_phone": "Buscar por teléfono",
  "evalink.update_contact": "Actualizar contacto",
  "evalink.create_service_request": "Crear orden de servicio",
  "evalink.get_system_status": "Estado del sistema",
  "evalink.add_authorized_contact": "Añadir contacto autorizado",
};

function friendlyAction(a: string): string {
  return ACTION_LABELS[a] || (a.split(".").pop() || a).replace(/_/g, " ");
}

const INTENT_COLORS: Record<string, string> = { tecnica: "#60a5fa", operativa: "#fbbf24", otra: "#71717a" };
const SENT_COLORS: Record<string, string> = { positivo: "#34d399", neutral: "#a1a1aa", negativo: "#f87171" };
const SENT_LABELS: Record<string, string> = { positivo: "Satisfecho", neutral: "Neutral", negativo: "Insatisfecho" };
const CHART_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb923c", "#38bdf8"];

// ─── Shared ───────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
      {label && <div style={{ color: "#71717a", marginBottom: 4 }}>{label}</div>}
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

function SLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-medium mb-3" style={{ color: "#71717a" }}>{children}</div>;
}

function KpiCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div style={{ padding: "18px 20px", background: "#111113", borderRadius: 12, border: "1px solid #1e1e22" }}>
      <div className="text-[11px] mb-2" style={{ color: "#52525b" }}>{label}</div>
      <div className="text-[32px] font-extralight tracking-tight leading-none" style={{ color: accent || "#fafafa" }}>{value}</div>
      {sub && <div className="text-[11px] mt-1.5" style={{ color: "#3f3f46" }}>{sub}</div>}
    </div>
  );
}

// ─── Call Row ──────────────────────────────────────────────────────
function CallRow({ call, onClick, isSelected }: { call: CallEvent; onClick: () => void; isSelected: boolean }) {
  return (
    <motion.div
      layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      onClick={onClick} className="cursor-pointer"
      style={{ padding: "12px 20px", borderBottom: "1px solid #141416", background: isSelected ? "#1a1a1e" : "transparent", transition: "background 0.15s" }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#111113"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div className="flex items-center gap-3">
        <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0,
          background: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate">{call.caller_name || "Cliente no identificado"}</span>
            {call.escalated_to_human && <span className="text-[10px] px-1.5 py-[1px] rounded" style={{ background: "#f8717112", color: "#f87171" }}>Derivada</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: "#52525b" }}>{call.intent_detail}</span>
            <span style={{ color: "#27272a" }}>&middot;</span>
            <span className="text-[10px]" style={{ color: "#3f3f46" }}>{call.zone}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px]" style={{ color: "#3f3f46" }}>{fmt(call.duration_seconds)}</span>
          <span className="text-[10px]" style={{ color: "#27272a" }}>{timeAgo(call.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Call Detail ──────────────────────────────────────────────────
function CallDetail({ call, onClose }: { call: CallEvent; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      className="h-full overflow-y-auto" style={{ borderLeft: "1px solid #1e1e22" }}>
      <div className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e22" }}>
        <div>
          <div className="text-[14px] font-medium">{call.caller_name || "Cliente no identificado"}</div>
          <div className="text-[11px]" style={{ color: "#52525b" }}>{call.caller_phone} &middot; {call.zone}</div>
        </div>
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, background: "#1f1f23", color: "#52525b", border: "none", cursor: "pointer", fontSize: 13 }}>&times;</button>
      </div>
      <div style={{
        margin: "16px 20px", padding: "12px 16px", borderRadius: 10,
        background: call.resolved ? "#34d39908" : call.escalated_to_human ? "#f8717108" : "#fbbf2408",
        border: `1px solid ${call.resolved ? "#34d39920" : call.escalated_to_human ? "#f8717120" : "#fbbf2420"}`,
      }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: 4, background: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" }} />
          <span className="text-[13px] font-medium" style={{ color: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" }}>
            {call.resolved ? "Resuelta automáticamente" : call.escalated_to_human ? "Derivada a operador" : "En proceso"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3" style={{ padding: "0 20px 16px" }}>
        {[
          { l: "Tipo de consulta", v: intentName(call.intent) },
          { l: "Duración", v: fmt(call.duration_seconds) },
          { l: "Satisfacción", v: SENT_LABELS[call.sentiment], c: SENT_COLORS[call.sentiment] },
          { l: "Tiempo de respuesta", v: `${(call.latency_ms / 1000).toFixed(1)}s` },
          ...(call.subscriber_id ? [{ l: "Abonado", v: call.subscriber_id, c: "#818cf8" }] : []),
          ...(call.alarm_type ? [{ l: "Tipo de alarma", v: call.alarm_type }] : []),
        ].map((item, i) => (
          <div key={i}>
            <div className="text-[10px] mb-1" style={{ color: "#3f3f46" }}>{item.l}</div>
            <div className="text-[12px]" style={{ color: ("c" in item && item.c) ? item.c : "#a1a1aa" }}>{item.v}</div>
          </div>
        ))}
      </div>
      {call.evalink_actions.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <div className="text-[10px] mb-2" style={{ color: "#3f3f46" }}>Acciones realizadas</div>
          <div className="flex flex-col gap-1.5">
            {call.evalink_actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div style={{ width: 4, height: 4, borderRadius: 2, background: "#818cf8" }} />
                <span className="text-[12px]" style={{ color: "#a1a1aa" }}>{friendlyAction(a)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: "0 20px 20px" }}>
        <div className="text-[10px] mb-2" style={{ color: "#3f3f46" }}>Resumen</div>
        <p className="text-[12px] leading-[1.7]" style={{ color: "#71717a" }}>{call.transcript_summary}</p>
      </div>
    </motion.div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────
function AnalyticsView({ stats }: { stats: DashboardStats }) {
  const hourlyData = stats.calls_per_hour.filter((_, i) => i >= 6 && i <= 22);
  const intentData = Object.entries(stats.calls_by_intent).map(([k, v]) => ({ name: intentName(k), value: v, fill: INTENT_COLORS[k] }));
  const sentimentData = Object.entries(stats.sentiment_breakdown).map(([k, v]) => ({ name: SENT_LABELS[k], value: v, fill: SENT_COLORS[k] }));

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="Llamadas hoy" value={stats.total_calls_today} />
        <KpiCard label="Resueltas por IA" value={`${stats.auto_resolved_pct}%`} accent="#34d399" sub="sin intervención humana" />
        <KpiCard label="Clientes identificados" value={`${stats.auto_identified_pct}%`} accent="#818cf8" sub="reconocidos automáticamente" />
        <KpiCard label="Duración media" value={fmt(stats.avg_duration_seconds)} sub="por llamada" />
        <KpiCard label="Derivadas a operador" value={`${stats.escalated_pct}%`} accent={stats.escalated_pct > 20 ? "#f87171" : "#a1a1aa"} sub="requirieron asistencia humana" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2" style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Llamadas por hora — resueltas por IA vs derivadas a operador</SLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#3f3f46", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#3f3f46", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="resolved" name="Resueltas por IA" stroke="#34d399" fill="url(#gR)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="escalated" name="Derivadas" stroke="#f87171" fill="url(#gE)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Flujo de llamadas</SLabel>
          <div className="flex flex-col gap-3 mt-2">
            {stats.resolution_funnel.map((step, i) => {
              const maxCount = stats.resolution_funnel[0].count || 1;
              const pct = Math.round((step.count / maxCount) * 100);
              const colors = ["#818cf8", "#60a5fa", "#34d399", "#f87171"];
              return (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{step.stage}</span>
                    <span className="text-[11px] tabular-nums" style={{ color: "#52525b" }}>{step.count} <span style={{ color: "#3f3f46" }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#1e1e22" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      style={{ height: 6, borderRadius: 3, background: colors[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Tipo de consulta</SLabel>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={intentData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                {intentData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {intentData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: 2, background: d.fill }} />
                <span className="text-[10px]" style={{ color: "#71717a" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Satisfacción del cliente</SLabel>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                {sentimentData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {sentimentData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: 3, background: d.fill }} />
                <span className="text-[10px]" style={{ color: "#71717a" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Motivo de alarma</SLabel>
          {stats.alarm_types.length > 0 ? (
            <div className="flex flex-col gap-2.5 mt-1">
              {stats.alarm_types.slice(0, 6).map((at, i) => {
                const maxC = stats.alarm_types[0].count || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{at.type}</span>
                      <span className="text-[11px] tabular-nums" style={{ color: "#52525b" }}>{at.count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "#1e1e22" }}>
                      <div style={{ height: 4, borderRadius: 2, width: `${(at.count / maxC) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] mt-4" style={{ color: "#3f3f46" }}>Sin datos</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Resolución por zona</SLabel>
          <div className="flex flex-col gap-3 mt-1">
            {stats.zones.slice(0, 8).map((z, i) => {
              const pct = z.calls > 0 ? Math.round((z.resolved / z.calls) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] truncate flex-1" style={{ color: "#a1a1aa" }}>{z.zone}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] tabular-nums" style={{ color: "#3f3f46" }}>{z.calls}</span>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "#1e1e22" }}>
                      <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171" }} />
                    </div>
                    <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171" }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Operaciones más frecuentes</SLabel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.top_actions.slice(0, 6).map(a => ({ ...a, label: friendlyAction(a.action) }))} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={140} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {stats.top_actions.slice(0, 6).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.7} />)}
              </Bar>
              <Tooltip content={<ChartTip />} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#111113", borderRadius: 12, border: "1px solid #1e1e22", padding: "16px 20px" }}>
          <SLabel>Duración media por tipo de consulta</SLabel>
          <div className="flex flex-col gap-5 mt-3">
            {stats.avg_duration_by_intent.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[18px]">{intentEmoji(d.intent)}</span>
                <div className="flex-1">
                  <div className="text-[11px]" style={{ color: "#71717a" }}>{intentName(d.intent)}</div>
                  <div className="text-[20px] font-extralight tabular-nums" style={{ color: INTENT_COLORS[d.intent] }}>{fmt(d.avg)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { calls, stats, connected } = useLiveCalls();
  const [selectedCall, setSelectedCall] = useState<CallEvent | null>(null);
  const [view, setView] = useState<"resumen" | "llamadas">("resumen");
  const [filter, setFilter] = useState<"all" | "tecnica" | "operativa" | "escalated">("all");

  const filteredCalls = calls.filter((c) => {
    if (filter === "tecnica") return c.intent === "tecnica";
    if (filter === "operativa") return c.intent === "operativa";
    if (filter === "escalated") return c.escalated_to_human;
    return true;
  });

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between shrink-0" style={{ height: 48, padding: "0 20px", borderBottom: "1px solid #1e1e22" }}>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold tracking-tight">PROSEGUR</span>
          <div style={{ width: 1, height: 14, background: "#27272a" }} />
          <span className="text-[13px] font-bold" style={{ color: "#818cf8" }}>iSOC</span>
          <div style={{ width: 1, height: 14, background: "#27272a" }} />
          <div className="flex items-center gap-0.5 ml-1" style={{ background: "#111113", borderRadius: 6, padding: 2 }}>
            {(["resumen", "llamadas"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", fontWeight: view === v ? 500 : 400,
                  background: view === v ? "#1f1f23" : "transparent", color: view === v ? "#fafafa" : "#52525b", transition: "all 0.15s" }}>
                {v === "resumen" ? "Resumen" : "Llamadas"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <span className="text-[11px]" style={{ color: "#52525b" }}>
              <span style={{ color: "#fafafa", fontWeight: 500 }}>{stats.total_calls_today}</span> llamadas hoy
              <span style={{ color: "#27272a" }}> &middot; </span>
              <span style={{ color: "#34d399" }}>{stats.auto_resolved_pct}%</span> resueltas por IA
            </span>
          )}
          <div style={{ width: 1, height: 14, background: "#1e1e22" }} />
          <div className="flex items-center gap-1.5">
            <div style={{ width: 6, height: 6, borderRadius: 3, background: connected ? "#34d399" : "#f87171", animation: connected ? "live-pulse 2s ease-in-out infinite" : "none" }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: connected ? "#34d399" : "#f87171" }}>
              {connected ? "En vivo" : "..."}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "#1e1e22" }} />
          <span className="text-[10px]" style={{ color: "#71717a" }}>Powered by <span style={{ color: "#fafafa" }}>HappyRobot</span></span>
        </div>
      </header>

      {view === "resumen" && stats ? (
        <AnalyticsView stats={stats} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1 shrink-0" style={{ padding: "10px 20px" }}>
              {([
                { key: "all", label: "Todas" },
                { key: "tecnica", label: "Soporte técnico" },
                { key: "operativa", label: "Gestión de cuenta" },
                { key: "escalated", label: "Derivadas" },
              ] as const).map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer",
                    background: filter === f.key ? "#1f1f23" : "transparent", color: filter === f.key ? "#fafafa" : "#3f3f46", transition: "all 0.15s" }}>
                  {f.label}
                </button>
              ))}
              <span className="text-[10px] ml-2 tabular-nums" style={{ color: "#27272a" }}>{filteredCalls.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
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
