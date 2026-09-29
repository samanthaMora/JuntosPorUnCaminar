// Cancela una cita (respetando el límite de cambios para pacientes) y
// reembolsa el pago completo.
import { adminClient, json, userClient } from '../_shared/clients.ts';
import { refundInFull } from '../_shared/connect.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { appointment_id } = await req.json();
  if (!appointment_id) return json({ error: 'Faltan datos' }, 400);

  const { data: appt, error } = await userClient(req).rpc('cancel_appointment', {
    p_appointment_id: appointment_id,
  });
  if (error) return json({ error: error.message }, 409);

  if (appt.stripe_payment_intent_id) {
    try {
      await refundInFull(appt.stripe_payment_intent_id);
      await adminClient
        .from('appointments')
        .update({ refunded_at: new Date().toISOString() })
        .eq('id', appt.id);
    } catch (e) {
      // La cita ya quedó cancelada; el reembolso se puede reintentar desde Stripe.
      console.error('Reembolso fallido', appt.id, e);
      return json({ cancelled: true, refunded: false });
    }
  }

  return json({ cancelled: true, refunded: true });
});
