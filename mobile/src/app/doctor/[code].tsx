import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { SlotPicker } from '@/components/SlotPicker';
import { Card, colors, Loading, Muted, Screen, Title } from '@/components/ui';
import { Alert } from '@/lib/alert';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { usePayment } from '@/lib/payments';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Doctor, Slot } from '@/lib/types';

type DoctorWithName = Doctor & { profiles: { full_name: string } };

type Booking = { appointment_id: string; client_secret: string; hold_expires_at: string };

/** Espera a que el webhook de Stripe confirme la cita. */
async function waitForConfirmation(appointmentId: string, attempts = 15) {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase.from('appointments').select('status').eq('id', appointmentId).single();
    if (data?.status === 'confirmed') return true;
    if (data?.status === 'cancelled') return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export default function DoctorProfile() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, profile, loading } = useAuth();
  const pay = usePayment();
  const [doctor, setDoctor] = useState<DoctorWithName | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('doctors')
      .select('*, profiles(full_name)')
      .eq('public_code', code.toUpperCase())
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data }) => setDoctor(data as DoctorWithName | null));
  }, [code, session]);

  if (loading) return <Loading />;
  if (!session) return <Redirect href={{ pathname: '/sign-in', params: { next: `/doctor/${code}` } }} />;
  if (doctor === undefined) return <Loading />;
  if (doctor === null) {
    return (
      <Screen>
        <Muted>No encontramos un doctor con el código {code}.</Muted>
      </Screen>
    );
  }

  async function book(slot: Slot) {
    if (profile?.role !== 'patient') return Alert.alert('Solo las cuentas de paciente pueden agendar citas.');
    setBusy(true);
    let booking: Booking | null = null;
    try {
      // 1. Aparta el horario y crea el cobro.
      booking = await invokeFunction<Booking>('create-booking', { doctor_id: doctor!.id, starts_at: slot.starts_at });

      // 2. El paciente paga.
      const payment = await pay({
        clientSecret: booking.client_secret,
        name: profile.full_name,
        email: session!.user.email,
      });
      if (payment.status !== 'paid') {
        await supabase.rpc('release_hold', { p_appointment_id: booking.appointment_id });
        if (payment.status === 'failed') Alert.alert('El pago no se completó', payment.message);
        setRefreshKey((k) => k + 1);
        return;
      }

      // 3. Se confirma con Stripe directamente; si no se puede, se espera al webhook.
      const check = await invokeFunction<{ status: string }>('confirm-booking', {
        appointment_id: booking.appointment_id,
      }).catch(() => null);
      if (check?.status === 'refunded') {
        Alert.alert(
          'Ese horario ya no está disponible',
          'Alguien más lo apartó mientras pagabas. Te devolvimos el pago completo; elige otro horario.',
        );
        setRefreshKey((k) => k + 1);
        return;
      }
      const confirmed = check?.status === 'confirmed' || (await waitForConfirmation(booking.appointment_id));
      Alert.alert(
        confirmed ? '¡Cita confirmada!' : 'Pago recibido',
        confirmed
          ? 'Te esperamos. Puedes ver tu cita en "Mis citas".'
          : 'Estamos confirmando tu pago; en unos momentos verás tu cita en "Mis citas".',
      );
      router.replace('/appointments');
    } catch (e) {
      Alert.alert('No se pudo agendar', (e as Error).message);
      setRefreshKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>{doctor.profiles.full_name}</Title>
      <Muted>{[doctor.specialty, doctor.city].filter(Boolean).join(' · ')}</Muted>
      {!!doctor.address && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Muted>{doctor.address}</Muted>
        </View>
      )}
      {!!doctor.bio && <Text style={{ fontSize: 15, lineHeight: 21 }}>{doctor.bio}</Text>}

      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>
          {formatMoney(doctor.price_cents, doctor.currency)} · {doctor.slot_minutes} min
        </Text>
        <Muted>
          El pago se hace al agendar. Puedes cambiar o cancelar tu cita (con reembolso) hasta{' '}
          {doctor.change_cutoff_hours} horas antes.
        </Muted>
      </Card>

      <Text style={{ fontSize: 17, fontWeight: '700' }}>Elige un horario</Text>
      <SlotPicker
        doctorId={doctor.id}
        timeZone={doctor.timezone}
        confirmLabel={`Pagar ${formatMoney(doctor.price_cents, doctor.currency)} y agendar`}
        busy={busy}
        onConfirm={book}
        refreshKey={refreshKey}
      />
    </Screen>
  );
}
