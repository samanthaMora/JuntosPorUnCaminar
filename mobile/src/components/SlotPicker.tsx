import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { addDays, dayKey, formatDay, formatTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Slot } from '@/lib/types';

import { Button, Chip, Loading, Muted } from './ui';

const DAYS_AHEAD = 21;

/** Muestra los días con horarios libres de un doctor y deja elegir uno. */
export function SlotPicker({
  doctorId,
  timeZone,
  onConfirm,
  confirmLabel,
  busy,
  refreshKey = 0,
}: {
  doctorId: string;
  timeZone: string;
  onConfirm: (slot: Slot) => void;
  confirmLabel: string;
  busy: boolean;
  refreshKey?: number;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);

  useEffect(() => {
    let active = true;
    const today = new Date();
    supabase
      .rpc('get_available_slots', {
        p_doctor_id: doctorId,
        p_from: dayKey(today, timeZone),
        p_to: dayKey(addDays(today, DAYS_AHEAD), timeZone),
      })
      .then(({ data, error }) => {
        if (!active) return;
        setError(error?.message ?? null);
        setSlots(data ?? []);
        setSelected(null);
      });
    return () => {
      active = false;
    };
  }, [doctorId, timeZone, refreshKey]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const key = dayKey(slot.starts_at, timeZone);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return groups;
  }, [slots, timeZone]);

  // Si el día elegido se quedó sin horarios, mostrar el primero disponible.
  const activeDay = day && byDay.has(day) ? day : (byDay.keys().next().value ?? null);

  if (!slots) return <Loading />;
  if (error) return <Muted>No se pudo cargar la agenda: {error}</Muted>;
  if (byDay.size === 0) return <Muted>No hay horarios disponibles en las próximas semanas.</Muted>;

  const daySlots = (activeDay && byDay.get(activeDay)) || [];

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[...byDay.entries()].map(([key, list]) => (
          <Chip
            key={key}
            label={formatDay(list[0].starts_at, timeZone).replace(/ de [a-z]+$/, '')}
            selected={key === activeDay}
            onPress={() => {
              setDay(key);
              setSelected(null);
            }}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {daySlots.map((slot) => (
          <Chip
            key={slot.starts_at}
            label={formatTime(slot.starts_at, timeZone)}
            selected={selected?.starts_at === slot.starts_at}
            onPress={() => setSelected(slot)}
          />
        ))}
      </View>

      {selected && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15 }}>
            {formatDay(selected.starts_at, timeZone)} a las {formatTime(selected.starts_at, timeZone)}
          </Text>
          <Button title={confirmLabel} loading={busy} onPress={() => onConfirm(selected)} />
        </View>
      )}
    </View>
  );
}
