// Cuenta de cobro del doctor en Stripe Connect.
//   action "onboard":   crea la cuenta (si falta) y devuelve el enlace de alta de Stripe.
//   action "refresh":   consulta a Stripe y actualiza si ya puede cobrar.
//   action "dashboard": enlace al panel de Stripe donde el doctor ve sus depósitos.
import { adminClient, corsHeaders, json, stripe, userClient } from '../_shared/clients.ts';
import { syncPayoutAccount } from '../_shared/connect.ts';

const RETURN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/connect-return`;

// Stripe ya no permite crear cuentas conectadas con Accounts v1 y el SDK aún no
// trae Accounts v2. Las cuentas v2 siguen funcionando con los endpoints v1
// (consultar, panel de Express, cobros y webhook account.updated).
async function stripeV2<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      'Stripe-Version': '2026-08-26.dahlia',
      'Content-Type': 'application/json',
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Error con Stripe');
  return data as T;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { data: auth } = await userClient(req).auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: 'No autenticado' }, 401);

  const { data: doctor } = await adminClient.from('doctors').select('id').eq('id', user.id).maybeSingle();
  if (!doctor) return json({ error: 'Solo los doctores tienen cuenta de cobro' }, 403);

  const { action } = await req.json();
  const { data: payout } = await adminClient
    .from('doctor_payout_accounts')
    .select('stripe_account_id')
    .eq('doctor_id', user.id)
    .maybeSingle();

  try {
    if (action === 'onboard') {
      let accountId = payout?.stripe_account_id;
      if (!accountId) {
        // Equivalente a una cuenta Express: Stripe hace la verificación de
        // identidad y el doctor tiene un panel sencillo para ver sus depósitos.
        const account = await stripeV2<{ id: string }>(
          '/v2/core/accounts',
          {
            contact_email: user.email,
            dashboard: 'express',
            identity: { country: 'mx', entity_type: 'individual' },
            configuration: {
              merchant: {
                mcc: '8011', // Doctores
                capabilities: { card_payments: { requested: true } },
              },
              recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
            },
            defaults: {
              currency: 'mxn',
              responsibilities: { fees_collector: 'application', losses_collector: 'application' },
            },
            metadata: { doctor_id: user.id },
          },
          `doctor-account-v2-${user.id}`,
        );
        const { error } = await adminClient
          .from('doctor_payout_accounts')
          .insert({ doctor_id: user.id, stripe_account_id: account.id });
        if (error && error.code !== '23505') throw error;
        accountId = account.id;
      }

      const link = await stripeV2<{ url: string }>('/v2/core/account_links', {
        account: accountId,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            configurations: ['merchant', 'recipient'],
            return_url: RETURN_URL,
            refresh_url: `${RETURN_URL}?expired=1`,
          },
        },
      });
      return json({ url: link.url });
    }

    if (!payout) return json({ details_submitted: false, ready: false });

    if (action === 'refresh') {
      const account = await stripe.accounts.retrieve(payout.stripe_account_id);
      return json(await syncPayoutAccount(account));
    }

    if (action === 'dashboard') {
      const link = await stripe.accounts.createLoginLink(payout.stripe_account_id);
      return json({ url: link.url });
    }

    return json({ error: 'Acción desconocida' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message ?? 'Error con Stripe' }, 502);
  }
});
