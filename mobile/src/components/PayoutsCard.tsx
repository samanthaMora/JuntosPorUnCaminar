import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alert';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { PayoutStatus } from '@/lib/types';

import { Button, Card, colors, Muted } from './ui';

/** Estado de la cuenta de Stripe del doctor y accesos al alta y a su panel. */
export function PayoutsCard({ priceCents }: { priceCents: number }) {
  const { session } = useAuth();
  // undefined = cargando, null = aún no tiene cuenta.
  const [status, setStatus] = useState<PayoutStatus | null | undefined>(undefined);
  const [feePercent, setFeePercent] = useState(0);
  const [busy, setBusy] = useState<'onboard' | 'dashboard' | null>(null);

  const refresh = useCallback(async () => {
    const s = await invokeFunction<PayoutStatus>('connect-account', { action: 'refresh' });
    setStatus(s);
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: payout }, { data: settings }] = await Promise.all([
        supabase.from('doctor_payout_accounts').select('details_submitted, ready').eq('doctor_id', session!.user.id).maybeSingle(),
        supabase.from('platform_settings').select('fee_percent').single(),
      ]);
      setFeePercent(Number(settings?.fee_percent ?? 0));
      setStatus(payout);
      // Si Stripe seguía revisando sus datos, pregunta de nuevo.
      if (payout && !payout.ready) refresh().catch(() => {});
    })();
  }, [session, refresh]);

  async function onboard() {
    setBusy('onboard');
    try {
      const { url } = await invokeFunction<{ url: string }>('connect-account', { action: 'onboard' });
      await WebBrowser.openBrowserAsync(url);
      const s = await refresh();
      if (s.ready) Alert.alert('¡Listo!', 'Ya puedes recibir pagos de tus pacientes.');
      else if (s.details_submitted)
        Alert.alert('Datos enviados', 'Stripe está revisando tu información. Suele tardar unos minutos.');
    } catch (e) {
      Alert.alert('No se pudo abrir Stripe', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openDashboard() {
    setBusy('dashboard');
    try {
      const { url } = await invokeFunction<{ url: string }>('connect-account', { action: 'dashboard' });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert('No se pudo abrir el panel', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const fee = Math.round((priceCents * feePercent) / 100);

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16 }}>Cobros</Text>
      {status === undefined ? (
        <Muted>Cargando…</Muted>
      ) : status?.ready ? (
        <Text style={{ color: colors.primary, fontWeight: '600' }}>✓ Tu cuenta puede recibir pagos</Text>
      ) : status?.details_submitted ? (
        <Muted>Stripe está revisando tus datos. Si te pide algo más, toca “Continuar configuración”.</Muted>
      ) : (
        <Muted>
          Para que tus pacientes puedan agendar, registra la cuenta bancaria (CLABE) donde recibirás tus pagos. Stripe te
          pedirá tu identificación y RFC.
        </Muted>
      )}

      <Muted>
        Por cada consulta de {formatMoney(priceCents)} recibes {formatMoney(priceCents - fee)} (comisión de la plataforma:{' '}
        {feePercent}%). Stripe deposita en tu cuenta bancaria automáticamente.
      </Muted>

      {status?.details_submitted ? (
        <>
          {!status.ready && <Button title="Continuar configuración" onPress={onboard} loading={busy === 'onboard'} />}
          <Button
            title="Ver mis pagos y depósitos"
            variant="secondary"
            onPress={openDashboard}
            loading={busy === 'dashboard'}
          />
        </>
      ) : (
        <Button
          title={status ? 'Continuar configuración' : 'Configurar cobros'}
          onPress={onboard}
          loading={busy === 'onboard'}
        />
      )}
    </Card>
  );
}
