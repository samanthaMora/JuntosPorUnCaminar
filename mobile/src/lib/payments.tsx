import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useCallback, type ReactNode } from 'react';

export type PaymentRequest = { clientSecret: string; name: string; email?: string };
export type PaymentResult = { status: 'paid' } | { status: 'canceled' } | { status: 'failed'; message: string };

export function PaymentsProvider({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!} urlScheme="citas">
      <>{children}</>
    </StripeProvider>
  );
}

/** Cobra con la hoja de pago nativa de Stripe. */
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  return useCallback(
    async ({ clientSecret, name, email }: PaymentRequest): Promise<PaymentResult> => {
      const init = await initPaymentSheet({
        merchantDisplayName: 'Citas',
        paymentIntentClientSecret: clientSecret,
        returnURL: Linking.createURL('stripe-redirect'),
        defaultBillingDetails: { name, email },
      });
      if (init.error) throw new Error(init.error.message);

      const payment = await presentPaymentSheet();
      if (!payment.error) return { status: 'paid' };
      if (payment.error.code === 'Canceled') return { status: 'canceled' };
      return { status: 'failed', message: payment.error.message };
    },
    [initPaymentSheet, presentPaymentSheet],
  );
}
