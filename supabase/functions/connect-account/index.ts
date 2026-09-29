// Cuenta de cobro del doctor en Stripe Connect.
//   action "onboard":   crea la cuenta (si falta) y devuelve el enlace de alta de Stripe.
//   action "refresh":   consulta a Stripe y actualiza si ya puede cobrar.
//   action "dashboard": enlace al panel de Stripe donde el doctor ve sus depósitos.
import { adminClient, json, stripe, userClient } from '../_shared/clients.ts';
import { syncPayoutAccount } from '../_shared/connect.ts';

const RETURN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/connect-return`;

Deno.serve(async (req) => {
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
        const account = await stripe.accounts.create(
          {
            country: 'MX',
            email: user.email,
            business_type: 'individual',
            controller: {
              stripe_dashboard: { type: 'express' },
              fees: { payer: 'application' },
              losses: { payments: 'application' },
            },
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            business_profile: {
              mcc: '8011', // Doctores
              product_description: 'Consultas médicas agendadas y pagadas a través de la app Citas',
            },
            metadata: { doctor_id: user.id },
          },
          { idempotencyKey: `doctor-account-${user.id}` },
        );
        const { error } = await adminClient
          .from('doctor_payout_accounts')
          .insert({ doctor_id: user.id, stripe_account_id: account.id });
        if (error && error.code !== '23505') throw error;
        accountId = account.id;
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: RETURN_URL,
        refresh_url: `${RETURN_URL}?expired=1`,
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
