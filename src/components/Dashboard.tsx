"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveCalls } from "@/hooks/use-live-calls";
import { CallEvent } from "@/lib/types";

// --- Utility ---
function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function sentimentColor(s: string) {
  if (s === "positivo") return { bg: "rgba(52,211,153,0.1)", text: "#34d399", border: "rgba(52,211,153,0.2)" };
  if (s === "negativo") return { bg: "rgba(248,113,113,0.1)", text: "#f87171", border: "rgba(248,113,113,0.2)" };
  return { bg: "rgba(161,161,170,0.1)", text: "#a1a1aa", border: "rgba(161,161,170,0.2)" };
}

function intentIcon(intent: string) {
  if (intent === "tecnica") return "T";
  if (intent === "operativa") return "O";
  return "?";
}

function intentLabel(intent: string) {
  if (intent === "tecnica") return "Técnica";
  if (intent === "operativa") return "Operativa";
  return "Otra";
}

// --- Stat Pill ---
function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-widest" style={{ color: "#71717a" }}>{label}</span>
      <span className="text-[28px] font-light tracking-tight leading-none" style={{ color: accent || "#fafafa" }}>{value}</span>
      {sub && <span className="text-[11px]" style={{ color: "#52525b" }}>{sub}</span>}
    </div>
  );
}

// --- Mini bar chart ---
function MiniBar({ data, maxH = 40 }: { data: { label: string; value: number; color: string }[]; maxH?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height: maxH }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: (d.value / max) * maxH || 2 }}
            transition={{ duration: 0.6, delay: i * 0.03 }}
            style={{ width: 6, borderRadius: 3, background: d.color, minHeight: 2 }}
          />
        </div>
      ))}
    </div>
  );
}

// --- Call Row ---
function CallRow({ call, onClick, isSelected }: { call: CallEvent; onClick: () => void; isSelected: boolean }) {
  const sc = sentimentColor(call.sentiment);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group cursor-pointer"
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #1e1e22",
        background: isSelected ? "#1f1f23" : "transparent",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#141416"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div className="flex items-center gap-3">
        {/* Intent badge */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 28, height: 28, borderRadius: 7,
            background: call.intent === "tecnica" ? "rgba(96,165,250,0.1)" : call.intent === "operativa" ? "rgba(251,191,36,0.1)" : "rgba(161,161,170,0.1)",
            color: call.intent === "tecnica" ? "#60a5fa" : call.intent === "operativa" ? "#fbbf24" : "#a1a1aa",
            fontSize: 11, fontWeight: 600,
          }}
        >
          {intentIcon(call.intent)}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate" style={{ color: "#fafafa" }}>
              {call.caller_name || call.caller_phone}
            </span>
            {call.identified && (
              <span className="text-[10px] px-[5px] py-[1px] rounded" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>ID</span>
            )}
            {call.escalated_to_human && (
              <span className="text-[10px] px-[5px] py-[1px] rounded" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>Escalado</span>
            )}
          </div>
          <span className="text-[11px] truncate block" style={{ color: "#71717a" }}>{call.intent_detail}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] px-[6px] py-[2px] rounded" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
            {call.sentiment}
          </span>
          <span className="text-[11px] tabular-nums" style={{ color: "#52525b" }}>{formatDuration(call.duration_seconds)}</span>
          <span className="text-[11px]" style={{ color: "#3f3f46" }}>{timeAgo(call.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Call Detail ---
function CallDetail({ call, onClose }: { call: CallEvent; onClose: () => void }) {
  const sc = sentimentColor(call.sentiment);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="h-full overflow-y-auto"
      style={{ borderLeft: "1px solid #1e1e22" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e22" }}>
        <div>
          <div className="text-[15px] font-medium">{call.caller_name || "Desconocido"}</div>
          <div className="text-[12px]" style={{ color: "#71717a" }}>{call.caller_phone}</div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 6, background: "#1f1f23", color: "#71717a", border: "none", cursor: "pointer", fontSize: 14 }}
        >
          &times;
        </button>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4" style={{ padding: "20px" }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Estado</div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 6, height: 6, borderRadius: 3, background: call.resolved ? "#34d399" : call.escalated_to_human ? "#f87171" : "#fbbf24" }} />
            <span className="text-[13px]">{call.resolved ? "Resuelto" : call.escalated_to_human ? "Escalado" : "Pendiente"}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Duración</div>
          <span className="text-[13px] font-mono">{formatDuration(call.duration_seconds)}</span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Intención</div>
          <span className="text-[13px]">{intentLabel(call.intent)}</span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Sentimiento</div>
          <span className="text-[13px] px-[6px] py-[2px] rounded" style={{ background: sc.bg, color: sc.text }}>{call.sentiment}</span>
        </div>
        {call.subscriber_id && (
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Abonado</div>
            <span className="text-[13px] font-mono" style={{ color: "#818cf8" }}>{call.subscriber_id}</span>
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#52525b" }}>Run ID</div>
          <span className="text-[11px] font-mono" style={{ color: "#52525b" }}>{call.workflow_run_id}</span>
        </div>
      </div>

      {/* Evalink actions */}
      {call.evalink_actions.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>Acciones Evalink</div>
          <div className="flex flex-col gap-1">
            {call.evalink_actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div style={{ width: 4, height: 4, borderRadius: 2, background: "#818cf8" }} />
                <span className="text-[12px] font-mono" style={{ color: "#a1a1aa" }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ padding: "0 20px 20px" }}>
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>Resumen</div>
        <p className="text-[13px] leading-relaxed" style={{ color: "#a1a1aa" }}>{call.transcript_summary}</p>
      </div>
    </motion.div>
  );
}

// --- Main Dashboard ---
export default function Dashboard() {
  const { calls, stats, connected } = useLiveCalls();
  const [selectedCall, setSelectedCall] = useState<CallEvent | null>(null);
  const [filter, setFilter] = useState<"all" | "tecnica" | "operativa" | "escalated">("all");

  const filteredCalls = calls.filter((c) => {
    if (filter === "tecnica") return c.intent === "tecnica";
    if (filter === "operativa") return c.intent === "operativa";
    if (filter === "escalated") return c.escalated_to_human;
    return true;
  });

  const hourlyData = stats?.calls_per_hour.slice(6, 22).map((h) => ({
    label: h.hour,
    value: h.count,
    color: "#818cf8",
  })) || [];

  return (
    <div className="flex flex-col h-screen">
      {/* --- Top bar --- */}
      <header className="flex items-center justify-between shrink-0" style={{ height: 52, padding: "0 20px", borderBottom: "1px solid #1e1e22" }}>
        <div className="flex items-center gap-4">
          {/* Prosegur text */}
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: "#fafafa" }}>PROSEGUR</span>
          <div style={{ width: 1, height: 16, background: "#27272a" }} />
          {/* iSOC */}
          <span className="text-[14px] font-semibold" style={{ color: "#818cf8" }}>iSOC</span>
          <div style={{ width: 1, height: 16, background: "#27272a" }} />
          <span className="text-[12px]" style={{ color: "#52525b" }}>Centro de Operaciones Inteligente</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 6, height: 6, borderRadius: 3,
                background: connected ? "#34d399" : "#f87171",
                animation: connected ? "live-pulse 2s ease-in-out infinite" : "none",
              }}
            />
            <span className="text-[11px]" style={{ color: connected ? "#34d399" : "#f87171" }}>
              {connected ? "EN VIVO" : "RECONECTANDO"}
            </span>
          </div>
          <div style={{ width: 1, height: 16, background: "#27272a" }} />
          {/* HappyRobot */}
          <span className="text-[11px]" style={{ color: "#3f3f46" }}>Powered by <span style={{ color: "#52525b" }}>HappyRobot</span></span>
        </div>
      </header>

      {/* --- Main content --- */}
      <div className="flex flex-1 overflow-hidden">
        {/* --- Left: Stats + Feed --- */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Stats row */}
          <div className="shrink-0" style={{ padding: "24px 24px 0" }}>
            {stats && (
              <div className="flex items-start gap-10">
                <Stat label="Llamadas hoy" value={stats.total_calls_today} />
                <Stat label="Resolución automática" value={`${stats.auto_resolved_pct}%`} accent="#34d399" />
                <Stat label="Identificación auto." value={`${stats.auto_identified_pct}%`} accent="#818cf8" />
                <Stat label="Duración media" value={formatDuration(stats.avg_duration_seconds)} />
                <Stat label="Escaladas" value={`${stats.escalated_pct}%`} accent={stats.escalated_pct > 20 ? "#f87171" : "#a1a1aa"} />
                <div className="flex flex-col gap-1 ml-auto">
                  <span className="text-[11px] uppercase tracking-widest" style={{ color: "#71717a" }}>Volumen por hora</span>
                  <MiniBar data={hourlyData} maxH={36} />
                </div>
              </div>
            )}
          </div>

          {/* Distribution bars */}
          {stats && (
            <div className="shrink-0 flex items-center gap-6" style={{ padding: "20px 24px 0" }}>
              {/* Intent distribution */}
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "#52525b" }}>Intención:</span>
                {(["tecnica", "operativa", "otra"] as const).map((intent) => {
                  const total = stats.calls_by_intent.tecnica + stats.calls_by_intent.operativa + stats.calls_by_intent.otra || 1;
                  const pct = Math.round((stats.calls_by_intent[intent] / total) * 100);
                  const colors = { tecnica: "#60a5fa", operativa: "#fbbf24", otra: "#71717a" };
                  return (
                    <div key={intent} className="flex items-center gap-1">
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: colors[intent] }} />
                      <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{intentLabel(intent)} {pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ width: 1, height: 12, background: "#1e1e22" }} />
              {/* Sentiment distribution */}
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "#52525b" }}>Sentimiento:</span>
                {(["positivo", "neutral", "negativo"] as const).map((s) => {
                  const total = stats.sentiment_breakdown.positivo + stats.sentiment_breakdown.neutral + stats.sentiment_breakdown.negativo || 1;
                  const pct = Math.round((stats.sentiment_breakdown[s] / total) * 100);
                  const colors = { positivo: "#34d399", neutral: "#a1a1aa", negativo: "#f87171" };
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: colors[s] }} />
                      <span className="text-[11px]" style={{ color: "#a1a1aa" }}>{s} {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter tabs + feed */}
          <div className="flex items-center gap-1 shrink-0" style={{ padding: "16px 24px 0" }}>
            {([
              { key: "all", label: "Todas" },
              { key: "tecnica", label: "Técnica" },
              { key: "operativa", label: "Operativa" },
              { key: "escalated", label: "Escaladas" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12,
                  cursor: "pointer",
                  background: filter === f.key ? "#1f1f23" : "transparent",
                  color: filter === f.key ? "#fafafa" : "#52525b",
                  transition: "all 0.15s",
                }}
              >
                {f.label}
                {f.key === "all" && stats && (
                  <span className="ml-1 tabular-nums" style={{ color: "#3f3f46" }}>{filteredCalls.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Call list */}
          <div className="flex-1 overflow-y-auto" style={{ marginTop: 8 }}>
            <AnimatePresence initial={false}>
              {filteredCalls.map((call) => (
                <CallRow
                  key={call.id}
                  call={call}
                  onClick={() => setSelectedCall(call)}
                  isSelected={selectedCall?.id === call.id}
                />
              ))}
            </AnimatePresence>

            {filteredCalls.length === 0 && (
              <div className="flex items-center justify-center" style={{ padding: 60 }}>
                <span className="text-[13px]" style={{ color: "#3f3f46" }}>Sin llamadas</span>
              </div>
            )}
          </div>
        </div>

        {/* --- Right: Detail panel --- */}
        <AnimatePresence>
          {selectedCall && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
              style={{ background: "#0e0e10" }}
            >
              <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
