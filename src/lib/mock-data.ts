import { CallEvent } from "./types";

const names = [
  "Carlos Mendoza", "Ana Beatriz Silva", "Roberto Ferreira", "María José Santos",
  "Pedro Almeida", "Lucía Oliveira", "Fernando Costa", "Patricia Rodrigues",
  "Diego Martínez", "Camila Pereira", "Rafael Nascimento", "Juliana Souza",
  "Miguel Ángel Torres", "Isabela Lima", "Andrés Ribeiro",
];

const intents: Array<{ intent: CallEvent["intent"]; detail: string; actions: string[] }> = [
  { intent: "tecnica", detail: "Consulta de eventos de alarma", actions: ["evalink.get_events", "evalink.get_subscriber"] },
  { intent: "tecnica", detail: "Verificación de cámaras CCTV", actions: ["evalink.get_subscriber", "evalink.check_cctv_status"] },
  { intent: "tecnica", detail: "Revisión de programación de central", actions: ["evalink.get_subscriber", "evalink.get_panel_schedule"] },
  { intent: "tecnica", detail: "Poner instalación en pruebas", actions: ["evalink.get_subscriber", "evalink.set_test_mode"] },
  { intent: "tecnica", detail: "Alarma activada sin motivo aparente", actions: ["evalink.get_events", "evalink.get_zone_status"] },
  { intent: "operativa", detail: "Identificación de abonado", actions: ["evalink.lookup_phone", "evalink.get_subscriber"] },
  { intent: "operativa", detail: "Actualización de datos de contacto", actions: ["evalink.get_subscriber", "evalink.update_contact"] },
  { intent: "operativa", detail: "Solicitud de servicio técnico", actions: ["evalink.get_subscriber", "evalink.create_service_request"] },
  { intent: "operativa", detail: "Consulta de estado de instalación", actions: ["evalink.get_subscriber", "evalink.get_system_status"] },
  { intent: "otra", detail: "Consulta general", actions: ["evalink.lookup_phone"] },
];

const summaries = [
  "El abonado llamó para verificar una alarma que saltó durante la madrugada. La IA identificó el evento en Evalink y confirmó que fue una falsa alarma por sensor de movimiento. Se recomendó revisión técnica.",
  "Llamada para consultar el estado de las cámaras CCTV del local comercial. Se verificaron 4 cámaras activas, 1 offline. Se programó visita técnica para el día siguiente.",
  "El cliente solicitó poner la instalación en modo pruebas por 2 horas para mantenimiento del sistema eléctrico. Acción ejecutada correctamente en Evalink.",
  "Solicitud de revisión de la programación de la central de intrusión. Se verificaron las zonas configuradas y se confirmó que todo estaba operativo.",
  "Llamada para reportar problemas con el teclado de la alarma. La IA recopiló los datos y generó un ticket de servicio técnico en Evalink.",
  "El abonado no fue identificado automáticamente. La IA recopiló nombre, código de abonado y dirección. Se localizó manualmente en Evalink y se actualizó el número de contacto.",
  "Consulta sobre eventos recientes de alarma. Se proporcionó resumen de últimos 5 eventos del día. El cliente quedó satisfecho con la información.",
  "Llamada derivada a operador humano tras 3 intentos de identificación fallidos. El operador resolvió que el abonado llamaba desde un número nuevo.",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefix = ["+5511", "+5521", "+5531", "+5541", "+5551"];
  return `${randomFrom(prefix)}9${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export function generateMockCall(hoursAgo?: number): CallEvent {
  const now = new Date();
  const offset = hoursAgo ?? Math.random() * 0.1;
  const timestamp = new Date(now.getTime() - offset * 3600000);

  const identified = Math.random() > 0.15;
  const intentData = randomFrom(intents);
  const escalated = !identified && Math.random() > 0.6;
  const resolved = !escalated && Math.random() > 0.08;
  const sentiments: CallEvent["sentiment"][] = ["positivo", "neutral", "negativo"];
  const sentimentWeights = resolved ? [0.6, 0.3, 0.1] : [0.1, 0.3, 0.6];
  const r = Math.random();
  const sentiment = r < sentimentWeights[0] ? sentiments[0] : r < sentimentWeights[0] + sentimentWeights[1] ? sentiments[1] : sentiments[2];

  return {
    id: crypto.randomUUID(),
    timestamp: timestamp.toISOString(),
    caller_phone: randomPhone(),
    caller_name: identified ? randomFrom(names) : null,
    subscriber_id: identified ? `SUB-${Math.floor(10000 + Math.random() * 90000)}` : null,
    identified,
    intent: intentData.intent,
    intent_detail: intentData.detail,
    action_taken: intentData.actions.join(" → "),
    resolved,
    escalated_to_human: escalated,
    sentiment,
    duration_seconds: Math.floor(45 + Math.random() * 300),
    transcript_summary: randomFrom(summaries),
    evalink_actions: intentData.actions,
    workflow_run_id: `run_${crypto.randomUUID().slice(0, 8)}`,
  };
}

export function generateInitialData(count: number = 47): CallEvent[] {
  const calls: CallEvent[] = [];
  for (let i = 0; i < count; i++) {
    calls.push(generateMockCall(Math.random() * 18));
  }
  return calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
