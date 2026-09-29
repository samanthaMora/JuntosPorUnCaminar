import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { Button, Card, colors, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { dayKey, formatDay, formatTime } from '@/lib/format';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Appointment, Doctor } from '@/lib/types';

type Row = Appointment & { patient: { full_name: string; phone: string | null } };

export default function Agenda() {
  const { session } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [canCharge, setCanCharge] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const [{ data: doc }, { data: payout }, { data: appts }] = await Promise.all([
      supabase.from('doctors').select('*').eq('id', session!.user.id).single(),
      supabase.from('doctor_payout_accounts').select('ready').eq('doctor_id', session!.user.id).maybeSingle(),
      supabase
        .from('appointments')
        .select('*, patient:profiles!appointments_patient_id_fkey(full_name, phone)')
        .eq('doctor_id', session!.user.id)
        .eq('status', 'confirmed')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at'),
    ]);
    setDoctor(doc);
    setCanCharge(!!payout?.ready);
    setRows((appts as Row[]) ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!doctor) return null;
  const tz = doctor.timezone;

  function share() {
    const link = Linking.createURL(`doctor/${doctor!.public_code}`);
    Share.share({
      message: `Agenda tu cita conmigo en goodates. Búscame con el código ${doctor!.public_code} o abre: ${link}`,
    });
  }

  function cancel(row: Row) {
    Alert.alert('Cancelar cita', `Se cancelará la cita de ${row.patient.full_name} y se le reembolsará el pago.`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar cita',
        style: 'destructive',
        onPress: async () => {
          try {
            await invokeFunction('cancel-appointment', { appointment_id: row.id });
          } catch (e) {
            Alert.alert('No se pudo cancelar', (e as Error).message);
          }
          load();
        },
      },
    ]);
  }

  const days = new Map<string, Row[]>();
  for (const row of rows) {
    const key = dayKey(row.starts_at, tz);
    days.set(key, [...(days.get(key) ?? []), row]);
  }

  return (
    <Screen>
      {(!doctor.is_published || !canCharge || !doctor.license_verified_at) && (
        <Card>
          <Text style={{ fontWeight: '700', color: colors.danger }}>Tu perfil aún no es visible</Text>
          {!doctor.license_verified_at && (
            <Muted>
              • {doctor.license_number ? 'Estamos verificando tu cédula profesional.' : 'Registra tu cédula profesional.'}
            </Muted>
          )}
          {!canCharge && <Muted>• Configura tus cobros para recibir los pagos de tus pacientes.</Muted>}
          {!doctor.is_published && <Muted>• Configura tus horarios y precio, y activa “Aparecer en búsquedas”.</Muted>}
          <Button title="Ir a configuración" variant="secondary" onPress={() => router.push('/settings')} />
        </Card>
      )}
      <Card>
        <Muted>Tu código para pacientes</Muted>
        <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: 2, color: colors.primary }}>
          {doctor.public_code}
        </Text>
        <Button title="Compartir con mis pacientes" variant="secondary" onPress={share} />
      </Card>

      {rows.length === 0 && <Muted>No tienes citas próximas.</Muted>}
      {[...days.entries()].map(([key, list]) => (
        <View key={key} style={{ gap: 8 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, textTransform: 'capitalize' }}>
            {formatDay(list[0].starts_at, tz)}
          </Text>
          {list.map((row) => (
            <Card key={row.id}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {formatTime(row.starts_at, tz)} – {formatTime(row.ends_at, tz)} · {row.patient.full_name}
              </Text>
              {!!row.patient.phone && <Muted>📞 {row.patient.phone}</Muted>}
              <Button title="Cancelar y reembolsar" variant="danger" onPress={() => cancel(row)} />
            </Card>
          ))}
        </View>
      ))}
    </Screen>
  );
}
