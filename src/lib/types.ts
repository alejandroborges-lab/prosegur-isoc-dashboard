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
}

export interface DashboardStats {
  total_calls_today: number;
  auto_resolved_pct: number;
  avg_duration_seconds: number;
  auto_identified_pct: number;
  escalated_pct: number;
  calls_by_intent: { tecnica: number; operativa: number; otra: number };
  sentiment_breakdown: { positivo: number; neutral: number; negativo: number };
  calls_per_hour: { hour: string; count: number }[];
}
