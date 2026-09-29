import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alert';
import { SlotPicker } from '@/components/SlotPicker';
import { Card, Loading, Muted, Screen } from '@/components/ui';
import { changeDeadline, formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Appointment, Slot } from '@/lib/types';

type Row = Appointment & { doctors: { timezone: string; change_cutoff_hours: number; profiles: { full_name: string } } };

export default function Reschedule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appt, setAppt] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*, doctors(timezone, change_cutoff_hours, profiles(full_name))')
      .eq('id', id)
      .single()
      .then(({ data }) => setAppt(data as Row));
  }, [id]);

  if (!appt) return <Loading />;
  const tz = appt.doctors.timezone;

  async function reschedule(slot: Slot) {
    setBusy(true);
    const { error } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: appt!.id,
      p_new_starts_at: slot.starts_at,
    });
    setBusy(false);
    if (error) return Alert.alert('No se pudo cambiar la cita', error.message);
    Alert.alert('Cita actualizada', `Tu nueva cita es el ${formatDateTime(slot.starts_at, tz)}.`);
    router.back();
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{appt.doctors.profiles.full_name}</Text>
        <Muted>Cita actual: {formatDateTime(appt.starts_at, tz)}</Muted>
        <Muted>
          Límite para cambiarla: {formatDateTime(changeDeadline(appt.starts_at, appt.doctors.change_cutoff_hours), tz)}
        </Muted>
      </Card>
      <Text style={{ fontSize: 17, fontWeight: '700' }}>Elige el nuevo horario</Text>
      <SlotPicker doctorId={appt.doctor_id} timeZone={tz} confirmLabel="Cambiar a este horario" busy={busy} onConfirm={reschedule} />
    </Screen>
  );
}
