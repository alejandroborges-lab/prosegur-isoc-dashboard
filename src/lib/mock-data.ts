import { CallEvent } from "./types";

const names = [
  "Carlos Mendoza", "Ana Beatriz Silva", "Roberto Ferreira", "María José Santos",
  "Pedro Almeida", "Lucía Oliveira", "Fernando Costa", "Patricia Rodrigues",
  "Diego Martínez", "Camila Pereira", "Rafael Nascimento", "Juliana Souza",
  "Miguel Ángel Torres", "Isabela Lima", "Andrés Ribeiro", "Valentina Araújo",
  "Gabriel Moreira", "Mariana Cardoso", "Lucas Barbosa", "Sofia Teixeira",
];

const zones = [
  "São Paulo Centro", "São Paulo Norte", "São Paulo Sul", "Rio de Janeiro",
  "Belo Horizonte", "Curitiba", "Porto Alegre", "Brasília",
];

const alarmTypes = [
  "Intrusión", "Incendio", "Pánico", "Técnica", "Coacción", "Sabotaje", "Fallo de comunicación", null,
];

const intents: Array<{ intent: CallEvent["intent"]; detail: string; actions: string[] }> = [
  { intent: "tecnica", detail: "Consulta de eventos de alarma recientes", actions: ["evalink.get_events", "evalink.get_subscriber"] },
  { intent: "tecnica", detail: "Verificación de estado de cámaras CCTV", actions: ["evalink.get_subscriber", "evalink.check_cctv_status"] },
  { intent: "tecnica", detail: "Revisión de programación de central de intrusión", actions: ["evalink.get_subscriber", "evalink.get_panel_schedule"] },
  { intent: "tecnica", detail: "Poner instalación en modo pruebas", actions: ["evalink.get_subscriber", "evalink.set_test_mode"] },
  { intent: "tecnica", detail: "Alarma activada — verificación de zona", actions: ["evalink.get_events", "evalink.get_zone_status"] },
  { intent: "tecnica", detail: "Fallo de comunicación con central", actions: ["evalink.get_subscriber", "evalink.check_comm_status"] },
  { intent: "tecnica", detail: "Reseteo remoto de sensor", actions: ["evalink.get_subscriber", "evalink.reset_sensor"] },
  { intent: "operativa", detail: "Identificación de abonado por teléfono", actions: ["evalink.lookup_phone", "evalink.get_subscriber"] },
  { intent: "operativa", detail: "Actualización de datos de contacto", actions: ["evalink.get_subscriber", "evalink.update_contact"] },
  { intent: "operativa", detail: "Solicitud de servicio técnico presencial", actions: ["evalink.get_subscriber", "evalink.create_service_request"] },
  { intent: "operativa", detail: "Consulta de estado general de instalación", actions: ["evalink.get_subscriber", "evalink.get_system_status"] },
  { intent: "operativa", detail: "Alta de nuevo contacto autorizado", actions: ["evalink.get_subscriber", "evalink.add_authorized_contact"] },
  { intent: "otra", detail: "Consulta de facturación", actions: ["evalink.lookup_phone"] },
  { intent: "otra", detail: "Consulta general no clasificada", actions: ["evalink.lookup_phone"] },
];

const summaries = [
  "El abonado llamó para verificar una alarma que saltó durante la madrugada. La IA identificó el evento en Evalink y confirmó que fue una falsa alarma por sensor de movimiento en zona 3. Se recomendó revisión técnica del detector.",
  "Llamada para consultar el estado de las cámaras CCTV del local comercial. Se verificaron 4 cámaras activas y 1 offline (cámara trasera). Se programó visita técnica para el día siguiente y se notificó al equipo de mantenimiento.",
  "El cliente solicitó poner la instalación en modo pruebas por 2 horas para mantenimiento del sistema eléctrico. Acción ejecutada correctamente en Evalink. Se programó recordatorio automático para reactivar.",
  "Solicitud de revisión de la programación de la central de intrusión. Se verificaron 8 zonas configuradas, 2 deshabilitadas temporalmente. Se confirmó que la programación horaria estaba correcta.",
  "Llamada para reportar problemas con el teclado de la alarma — códigos no responden. La IA recopiló modelo del panel y síntomas, generó ticket de servicio técnico prioritario en Evalink.",
  "El abonado no fue identificado automáticamente. La IA recopiló nombre, código de abonado y dirección. Se localizó manualmente en Evalink y se actualizó el número de contacto para futuras identificaciones.",
  "Consulta sobre eventos recientes de alarma. Se proporcionó resumen de últimos 5 eventos del día incluyendo timestamps y zonas afectadas. El cliente confirmó que fueron entradas autorizadas.",
  "Llamada derivada a operador humano tras 3 intentos de identificación fallidos. El operador verificó que el abonado llamaba desde un número nuevo no registrado. Se actualizó la ficha.",
  "Alarma de intrusión en zona perimetral. La IA verificó el evento en Evalink, consultó el historial de la zona y determinó patrón de falsas alarmas. Se recomendó ajuste de sensibilidad.",
  "Fallo de comunicación detectado con la central del abonado. La IA ejecutó diagnóstico remoto, confirmó pérdida de señal GSM. Se generó orden de servicio para revisión de antena.",
  "Solicitud de alta de nuevo contacto autorizado para apertura/cierre. La IA recopiló datos del nuevo contacto y los registró en Evalink con permisos limitados según protocolo.",
  "Cliente reportó activación de alarma de pánico accidental. La IA verificó código de cancelación, confirmó identidad del abonado y canceló el protocolo de emergencia en Evalink.",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefix = ["+5511", "+5521", "+5531", "+5541", "+5551", "+5561", "+5571"];
  return `${randomFrom(prefix)}9${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export function generateMockCall(hoursAgo?: number): CallEvent {
  const now = new Date();
  const offset = hoursAgo ?? Math.random() * 0.1;
  const timestamp = new Date(now.getTime() - offset * 3600000);

  const identified = Math.random() > 0.15;
  const intentData = randomFrom(intents);
  const escalated = !identified && Math.random() > 0.5;
  const resolved = !escalated && Math.random() > 0.08;
  const sentiments: CallEvent["sentiment"][] = ["positivo", "neutral", "negativo"];
  const sentimentWeights = resolved ? [0.55, 0.35, 0.1] : [0.1, 0.25, 0.65];
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
    duration_seconds: Math.floor(30 + Math.random() * 330),
    transcript_summary: randomFrom(summaries),
    evalink_actions: intentData.actions,
    workflow_run_id: `run_${crypto.randomUUID().slice(0, 8)}`,
    latency_ms: Math.floor(800 + Math.random() * 2200),
    zone: randomFrom(zones),
    alarm_type: intentData.intent === "tecnica" ? randomFrom(alarmTypes.filter(Boolean)) : null,
  };
}

export function generateInitialData(count: number = 64): CallEvent[] {
  const calls: CallEvent[] = [];
  for (let i = 0; i < count; i++) {
    calls.push(generateMockCall(Math.random() * 20));
  }
  return calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
