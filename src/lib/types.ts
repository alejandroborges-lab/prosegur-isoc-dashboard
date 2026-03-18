export interface CallEvent {
  id: string;
  timestamp: string;
  caller_phone: string;
  caller_name: string | null;
  subscriber_id: string | null;
  identified: boolean;
  intent: "tecnica" | "operativa" | "otra";
  intent_detail: string;
  action_taken: string;
  resolved: boolean;
  escalated_to_human: boolean;
  sentiment: "positivo" | "neutral" | "negativo";
  duration_seconds: number;
  transcript_summary: string;
  evalink_actions: string[];
  workflow_run_id: string;
  latency_ms: number;
  zone: string;
  alarm_type: string | null;
}

export interface DashboardStats {
  total_calls_today: number;
  auto_resolved_pct: number;
  avg_duration_seconds: number;
  auto_identified_pct: number;
  escalated_pct: number;
  avg_latency_ms: number;
  calls_by_intent: { tecnica: number; operativa: number; otra: number };
  sentiment_breakdown: { positivo: number; neutral: number; negativo: number };
  calls_per_hour: { hour: string; count: number; resolved: number; escalated: number }[];
  resolution_funnel: { stage: string; count: number }[];
  top_actions: { action: string; count: number }[];
  zones: { zone: string; calls: number; resolved: number }[];
  alarm_types: { type: string; count: number }[];
  avg_duration_by_intent: { intent: string; avg: number }[];
}
