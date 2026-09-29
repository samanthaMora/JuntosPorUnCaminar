import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { Button, Card, colors, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { changeDeadline, formatDateTime, formatMoney } from '@/lib/format';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';

type Row = Appointment & {
  doctors: { public_code: string; change_cutoff_hours: number; timezone: string; profiles: { full_name: string } };
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  pending_payment: 'Esperando pago',
};

export default function MyAppointments() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(public_code, change_cutoff_hours, timezone, profiles(full_name))')
      .eq('patient_id', session!.user.id)
      .in('status', ['confirmed', 'cancelled', 'pending_payment'])
      .order('starts_at', { ascending: false });
    setRows((data as Row[]) ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function cancel(row: Row) {
    Alert.alert('Cancelar cita', 'Se cancelará tu cita y se reembolsará el pago completo.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusyId(row.id);
          try {
            const res = await invokeFunction<{ refunded: boolean }>('cancel-appointment', { appointment_id: row.id });
            Alert.alert(
              'Cita cancelada',
              res.refunded
                ? 'El reembolso puede tardar de 5 a 10 días hábiles en verse en tu tarjeta.'
                : 'Tu reembolso está en proceso.',
            );
          } catch (e) {
            Alert.alert('No se pudo cancelar', (e as Error).message);
          }
          setBusyId(null);
          load();
        },
      },
    ]);
  }

  const now = new Date();
  const upcoming = rows.filter((r) => r.status === 'confirmed' && new Date(r.ends_at) > now).reverse();
  const history = rows.filter((r) => !upcoming.includes(r));

  return (
    <Screen>
      {upcoming.length === 0 && <Muted>No tienes citas próximas.</Muted>}
      {upcoming.map((row) => {
        const tz = row.doctors.timezone;
        const deadline = changeDeadline(row.starts_at, row.doctors.change_cutoff_hours);
        const canChange = now < deadline;
        return (
          <Card key={row.id}>
            <Text style={{ fontSize: 17, fontWeight: '700' }}>{row.doctors.profiles.full_name}</Text>
            <Text style={{ fontSize: 15 }}>{formatDateTime(row.starts_at, tz)}</Text>
            <Text style={{ color: colors.primary }}>Pagada · {formatMoney(row.price_cents, row.currency)}</Text>
            {canChange ? (
              <>
                <Muted>Puedes cambiarla o cancelarla hasta el {formatDateTime(deadline, tz)}.</Muted>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Cambiar"
                      variant="secondary"
                      onPress={() => router.push({ pathname: '/reschedule/[id]', params: { id: row.id } })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Cancelar" variant="danger" loading={busyId === row.id} onPress={() => cancel(row)} />
                  </View>
                </View>
              </>
            ) : (
              <Muted>
                Ya no se puede cambiar ni cancelar (el límite es {row.doctors.change_cutoff_hours} h antes de la cita).
              </Muted>
            )}
          </Card>
        );
      })}

      {history.length > 0 && <Text style={{ fontWeight: '700', marginTop: 12 }}>Historial</Text>}
      {history.map((row) => (
        <Card key={row.id}>
          <Text style={{ fontWeight: '600' }}>{row.doctors.profiles.full_name}</Text>
          <Muted>
            {formatDateTime(row.starts_at, row.doctors.timezone)} ·{' '}
            {row.status === 'confirmed' ? 'Realizada' : STATUS_LABEL[row.status]}
            {row.refunded_at ? ' · Reembolsada' : ''}
          </Muted>
        </Card>
      ))}
    </Screen>
  );
}
