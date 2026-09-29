import type Stripe from 'npm:stripe@17';

import { adminClient, stripe } from './clients.ts';

/** Guarda en la base si la cuenta del doctor ya puede recibir pagos. */
export async function syncPayoutAccount(account: Stripe.Account) {
  const ready = account.details_submitted && account.capabilities?.transfers === 'active';
  const { error } = await adminClient
    .from('doctor_payout_accounts')
    .update({ details_submitted: account.details_submitted, ready, updated_at: new Date().toISOString() })
    .eq('stripe_account_id', account.id);
  if (error) throw error;
  return { details_submitted: account.details_submitted, ready };
}

/**
 * Reembolso completo al paciente: se le quita el dinero al doctor
 * (reverse_transfer) y la plataforma devuelve su comisión.
 */
export function refundInFull(paymentIntentId: string) {
  return stripe.refunds.create(
    { payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true },
    { idempotencyKey: `refund-${paymentIntentId}` },
  );
}
