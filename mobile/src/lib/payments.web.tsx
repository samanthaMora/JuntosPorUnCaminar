import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Text, View } from 'react-native';

import { Button, colors } from '@/components/ui';

export type PaymentRequest = { clientSecret: string; name: string; email?: string };
export type PaymentResult = { status: 'paid' } | { status: 'canceled' } | { status: 'failed'; message: string };

type Pending = PaymentRequest & { resolve: (r: PaymentResult) => void };

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const PaymentContext = createContext<((req: PaymentRequest) => Promise<PaymentResult>) | null>(null);

/** En web se cobra con el formulario de Stripe dentro de un modal. */
export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const pay = useCallback(
    (req: PaymentRequest) => new Promise<PaymentResult>((resolve) => setPending({ ...req, resolve })),
    [],
  );

  function finish(result: PaymentResult) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <PaymentContext.Provider value={pay}>
      {children}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => finish({ status: 'canceled' })}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 16 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
              gap: 16,
              width: '100%',
              maxWidth: 480,
              alignSelf: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Pago de la consulta</Text>
            {pending && (
              <Elements stripe={stripePromise} options={{ clientSecret: pending.clientSecret, locale: 'es' }}>
                <PaymentForm request={pending} onDone={finish} />
              </Elements>
            )}
          </View>
        </View>
      </Modal>
    </PaymentContext.Provider>
  );
}

function PaymentForm({ request, onDone }: { request: PaymentRequest; onDone: (r: PaymentResult) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: { billing_details: { name: request.name, email: request.email } },
      },
    });
    setBusy(false);
    // Los errores de tarjeta se muestran para que el paciente pueda corregirlos.
    if (stripeError) {
      if (stripeError.type === 'card_error' || stripeError.type === 'validation_error') {
        setError(stripeError.message ?? 'Revisa los datos de tu tarjeta.');
      } else {
        onDone({ status: 'failed', message: stripeError.message ?? 'Error de pago' });
      }
      return;
    }
    onDone({ status: 'paid' });
  }

  return (
    <View style={{ gap: 16 }}>
      <PaymentElement options={{ defaultValues: { billingDetails: { name: request.name, email: request.email } } }} />
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title="Pagar" onPress={submit} loading={busy} disabled={!stripe || !elements} />
      <Button title="Cancelar" variant="secondary" onPress={() => onDone({ status: 'canceled' })} disabled={busy} />
    </View>
  );
}

export function usePayment() {
  const pay = useContext(PaymentContext);
  if (!pay) throw new Error('usePayment debe usarse dentro de <PaymentsProvider>');
  return pay;
}
