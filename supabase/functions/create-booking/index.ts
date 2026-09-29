// Aparta un horario y crea el cobro en Stripe. La cita se confirma cuando
// llega el webhook `payment_intent.succeeded`.
import { adminClient, corsHeaders, json, stripe, userClient } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { doctor_id, starts_at } = await req.json();
  if (!doctor_id || !starts_at) return json({ error: 'Faltan datos' }, 400);

  const supabase = userClient(req);
  const { data: appt, error } = await supabase.rpc('create_pending_appointment', {
    p_doctor_id: doctor_id,
    p_starts_at: starts_at,
  });
  if (error) return json({ error: error.message }, 409);

  try {
    const { data: payout, error: payoutError } = await adminClient
      .from('doctor_payout_accounts')
      .select('stripe_account_id')
      .eq('doctor_id', appt.doctor_id)
      .eq('ready', true)
      .single();
    if (payoutError) throw payoutError;

    // Cargo a un destino: el paciente paga a la plataforma, Stripe transfiere
    // el importe al doctor y la plataforma se queda con su comisión.
    const intent = await stripe.paymentIntents.create(
      {
        amount: appt.price_cents,
        currency: appt.currency,
        automatic_payment_methods: { enabled: true },
        application_fee_amount: appt.platform_fee_cents,
        transfer_data: { destination: payout.stripe_account_id },
        metadata: { appointment_id: appt.id, doctor_id: appt.doctor_id },
        description: `Consulta ${appt.starts_at}`,
      },
      { idempotencyKey: `appointment-${appt.id}` },
    );

    const { error: updateError } = await adminClient
      .from('appointments')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', appt.id);
    if (updateError) throw updateError;

    return json({
      appointment_id: appt.id,
      client_secret: intent.client_secret,
      hold_expires_at: appt.hold_expires_at,
    });
  } catch (e) {
    // Sin cobro no hay apartado.
    await adminClient
      .from('appointments')
      .update({ status: 'expired' })
      .eq('id', appt.id)
      .eq('status', 'pending_payment');
    console.error(e);
    return json({ error: 'No se pudo iniciar el pago' }, 502);
  }
});
