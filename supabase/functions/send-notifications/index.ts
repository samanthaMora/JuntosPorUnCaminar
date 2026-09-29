// Envía los avisos pendientes por push (Expo). La llama pg_cron cada minuto
// con el header `x-cron-secret`. Desplegar con --no-verify-jwt.
import { adminClient, json } from '../_shared/clients.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type QueueRow = { id: number; user_id: string; appointment_id: string; kind: string };

type AppointmentInfo = {
  id: string;
  starts_at: string;
  doctors: { timezone: string; profiles: { full_name: string } };
  patient: { full_name: string };
};

function when(a: AppointmentInfo) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: a.doctors.timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(a.starts_at));
}

function buildMessage(kind: string, a: AppointmentInfo) {
  const doctor = a.doctors.profiles.full_name;
  const patient = a.patient.full_name;
  switch (kind) {
    case 'new_booking':
      return { title: 'Nueva cita', body: `${patient} agendó para el ${when(a)}.`, url: '/agenda' };
    case 'rescheduled':
      return { title: 'Cita reprogramada', body: `${patient} cambió su cita al ${when(a)}.`, url: '/agenda' };
    case 'cancelled_by_patient':
      return { title: 'Cita cancelada', body: `${patient} canceló su cita del ${when(a)}.`, url: '/agenda' };
    case 'cancelled_by_doctor':
      return {
        title: 'Tu cita fue cancelada',
        body: `${doctor} canceló tu cita del ${when(a)}. Te reembolsamos el pago completo.`,
        url: '/appointments',
      };
    case 'payment_refunded':
      return {
        title: 'No pudimos confirmar tu cita',
        body: `El horario del ${when(a)} con ${doctor} ya se había ocupado. Te reembolsamos el pago completo.`,
        url: '/appointments',
      };
    case 'reminder':
      return { title: 'Recordatorio de cita', body: `Tienes cita con ${doctor} el ${when(a)}.`, url: '/appointments' };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return json({ error: 'No autorizado' }, 401);
  }

  const { error: reminderError } = await adminClient.rpc('enqueue_reminders');
  if (reminderError) console.error('enqueue_reminders', reminderError);

  const { data: rows, error } = await adminClient.rpc('claim_notifications', { p_limit: 100 });
  if (error) return json({ error: error.message }, 500);
  const queue = (rows ?? []) as QueueRow[];
  if (queue.length === 0) return json({ sent: 0 });

  const [{ data: appts }, { data: tokens }] = await Promise.all([
    adminClient
      .from('appointments')
      .select('id, starts_at, doctors(timezone, profiles(full_name)), patient:profiles!appointments_patient_id_fkey(full_name)')
      .in('id', [...new Set(queue.map((q) => q.appointment_id))]),
    adminClient.from('push_tokens').select('token, user_id').in('user_id', [...new Set(queue.map((q) => q.user_id))]),
  ]);
  const apptById = new Map((appts as unknown as AppointmentInfo[] | null ?? []).map((a) => [a.id, a]));

  const messages: { to: string; title: string; body: string; data: { url: string }; sound: 'default' }[] = [];
  for (const row of queue) {
    const appt = apptById.get(row.appointment_id);
    const msg = appt && buildMessage(row.kind, appt);
    if (!msg) continue;
    for (const t of (tokens ?? []).filter((t) => t.user_id === row.user_id)) {
      messages.push({ to: t.token, title: msg.title, body: msg.body, data: { url: msg.url }, sound: 'default' });
    }
  }

  // Expo acepta hasta 100 mensajes por solicitud.
  const invalidTokens: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      // No se marcan como enviados: se reintentan en la siguiente ejecución.
      console.error('Expo push', res.status, await res.text());
      return json({ error: 'Expo push falló' }, 502);
    }
    const { data: tickets } = await res.json();
    tickets.forEach((ticket: { status: string; details?: { error?: string } }, j: number) => {
      if (ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(batch[j].to);
    });
  }

  if (invalidTokens.length) await adminClient.from('push_tokens').delete().in('token', invalidTokens);
  await adminClient
    .from('notification_queue')
    .update({ sent_at: new Date().toISOString() })
    .in('id', queue.map((q) => q.id));

  return json({ sent: messages.length });
});
