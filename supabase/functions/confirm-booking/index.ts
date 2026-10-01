// La app la llama justo después de que el paciente paga: pregunta a Stripe si
// el pago se completó y confirma la cita. Así no depende solo del webhook,
// que puede tardar o no estar configurado.
import { adminClient, corsHeaders, json, stripe, userClient } from '../_shared/clients.ts';
import { settlePayment } from '../_shared/connect.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { data: auth } = await userClient(req).auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: 'No autenticado' }, 401);

  const { appointment_id } = await req.json();
  const { data: appt } = await adminClient
    .from('appointments')
    .select('status, stripe_payment_intent_id')
    .eq('id', appointment_id)
    .eq('patient_id', user.id)
    .maybeSingle();
  if (!appt?.stripe_payment_intent_id) return json({ error: 'No encontramos la cita' }, 404);
  if (appt.status === 'confirmed') return json({ status: 'confirmed' });

  try {
    const intent = await stripe.paymentIntents.retrieve(appt.stripe_payment_intent_id);
    if (intent.status === 'processing') return json({ status: 'processing' });
    if (intent.status !== 'succeeded') return json({ status: 'unpaid' });
    const confirmed = await settlePayment(intent.id);
    return json({ status: confirmed ? 'confirmed' : 'refunded' });
  } catch (e) {
    console.error(e);
    return json({ error: 'No se pudo confirmar la cita' }, 502);
  }
});
