import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { DateField } from '@/components/DateField';
import { Button, Card, Chip, colors, Field, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDay, WEEKDAYS } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { AvailabilityRule } from '@/lib/types';

type TimeOff = { id: string; starts_at: string; ends_at: string; reason: string };

/** Fecha del calendario elegida en el selector, como "YYYY-MM-DD". */
function localDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Lunes primero.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Schedule() {
  const { session } = useAuth();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('14:00');
  const [busy, setBusy] = useState(false);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [offFrom, setOffFrom] = useState(() => new Date());
  const [offTo, setOffTo] = useState(() => new Date());
  const [offReason, setOffReason] = useState('');
  const [timezone, setTimezone] = useState<string | undefined>();

  const load = useCallback(async () => {
    const [{ data }, { data: off }, { data: doc }] = await Promise.all([
      supabase.from('availability_rules').select('*').eq('doctor_id', session!.user.id).order('start_time'),
      supabase
        .from('time_off')
        .select('id, starts_at, ends_at, reason')
        .eq('doctor_id', session!.user.id)
        .gt('ends_at', new Date().toISOString())
        .order('starts_at'),
      supabase.from('doctors').select('timezone').eq('id', session!.user.id).single(),
    ]);
    setRules(data ?? []);
    setTimeOff(off ?? []);
    setTimezone(doc?.timezone);
  }, [session]);

  async function addTimeOff() {
    setBusy(true);
    const { data: conflicts, error } = await supabase.rpc('add_time_off', {
      p_from: localDate(offFrom),
      p_to: localDate(offTo < offFrom ? offFrom : offTo),
      p_reason: offReason.trim(),
    });
    setBusy(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    setOffReason('');
    load();
    if (conflicts > 0) {
      Alert.alert(
        'Tienes citas en esas fechas',
        `Hay ${conflicts} cita(s) confirmada(s) en esos días. Los nuevos horarios quedan bloqueados, pero esas citas siguen en pie: cancélalas desde "Mi agenda" para reembolsar a los pacientes.`,
      );
    }
  }

  async function removeTimeOff(id: string) {
    await supabase.from('time_off').delete().eq('id', id);
    load();
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function add() {
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return Alert.alert('Usa el formato HH:MM, por ejemplo 09:30');
    if (start >= end) return Alert.alert('La hora de inicio debe ser antes que la de fin');
    if (days.length === 0) return Alert.alert('Elige al menos un día');
    setBusy(true);
    const { error } = await supabase
      .from('availability_rules')
      .insert(days.map((weekday) => ({ doctor_id: session!.user.id, weekday, start_time: start, end_time: end })));
    setBusy(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    load();
  }

  async function remove(id: string) {
    await supabase.from('availability_rules').delete().eq('id', id);
    load();
  }

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Agregar horario de atención</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {WEEK_ORDER.map((d) => (
            <Chip key={d} label={WEEKDAYS[d].slice(0, 3)} selected={days.includes(d)} onPress={() => toggleDay(d)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Desde" value={start} onChangeText={setStart} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Hasta" value={end} onChangeText={setEnd} placeholder="14:00" />
          </View>
        </View>
        <Muted>Puedes agregar varios bloques por día (ej. 09:00–14:00 y 16:00–19:00).</Muted>
        <Button title="Agregar" onPress={add} loading={busy} />
      </Card>

      {WEEK_ORDER.map((d) => {
        const dayRules = rules.filter((r) => r.weekday === d);
        return (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ width: 90, fontWeight: '600' }}>{WEEKDAYS[d]}</Text>
            {dayRules.length === 0 && <Muted>Sin atención</Muted>}
            {dayRules.map((r) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  Alert.alert('Quitar horario', `${WEEKDAYS[d]} ${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`, [
                    { text: 'No', style: 'cancel' },
                    { text: 'Quitar', style: 'destructive', onPress: () => remove(r.id) },
                  ])
                }
                style={{ backgroundColor: colors.primaryLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}
              >
                <Text style={{ color: colors.primary }}>
                  {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} ✕
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      <Muted>Las citas ya agendadas no cambian si modificas tus horarios.</Muted>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Días libres y vacaciones</Text>
        <Muted>Esos días no se podrán agendar citas.</Muted>
        <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
          <DateField
            label="Desde"
            value={offFrom}
            minimumDate={new Date()}
            onChange={(d) => {
              setOffFrom(d);
              if (offTo < d) setOffTo(d);
            }}
          />
          <DateField label="Hasta" value={offTo} minimumDate={offFrom} onChange={setOffTo} />
        </View>
        <Field label="Motivo (opcional, solo tú lo ves)" value={offReason} onChangeText={setOffReason} />
        <Button title="Bloquear fechas" onPress={addTimeOff} loading={busy} />
      </Card>

      {timeOff.map((t) => {
        // ends_at es la medianoche siguiente al último día libre.
        const lastDay = new Date(new Date(t.ends_at).getTime() - 1);
        const from = formatDay(t.starts_at, timezone);
        const to = formatDay(lastDay, timezone);
        return (
          <Card key={t.id}>
            <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{from === to ? from : `${from} – ${to}`}</Text>
            {!!t.reason && <Muted>{t.reason}</Muted>}
            <Button
              title="Quitar"
              variant="danger"
              onPress={() =>
                Alert.alert('Quitar días libres', 'Esas fechas volverán a estar disponibles para agendar.', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Quitar', style: 'destructive', onPress: () => removeTimeOff(t.id) },
                ])
              }
            />
          </Card>
        );
      })}
    </Screen>
  );
}
