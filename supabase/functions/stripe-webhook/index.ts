// Webhook de Stripe. Configura dos endpoints con esta misma URL:
//   * De la plataforma (STRIPE_WEBHOOK_SECRET): payment_intent.succeeded
//   * De cuentas conectadas (STRIPE_CONNECT_WEBHOOK_SECRET): account.updated
// Desplegar con --no-verify-jwt (Stripe no manda JWT; se valida la firma).
import Stripe from 'npm:stripe@17';
import { adminClient, json, stripe } from '../_shared/clients.ts';
import { refundInFull, syncPayoutAccount } from '../_shared/connect.ts';

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const secrets = [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(
  (s): s is string => !!s,
);

async function verify(body: string, signature: string) {
  for (const secret of secrets) {
    try {
      return await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
    } catch {
      // Probar con el siguiente secreto.
    }
  }
  return null;
}

Deno.serve(async (req) => {
  const body = await req.text();
  const event = await verify(body, req.headers.get('Stripe-Signature') ?? '');
  if (!event) return json({ error: 'Firma inválida' }, 400);

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { data: confirmed, error } = await adminClient.rpc('confirm_payment', {
        p_payment_intent_id: intent.id,
      });
      if (error) throw error;
      if (!confirmed) {
        // Pagó después de que venció su apartado y alguien más tomó el horario.
        await refundInFull(intent.id);
        await adminClient
          .from('appointments')
          .update({ refunded_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', intent.id);
      }
    }

    if (event.type === 'account.updated') {
      await syncPayoutAccount(event.data.object);
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'Error procesando el evento' }, 500); // Stripe reintentará
  }

  return json({ received: true });
});
