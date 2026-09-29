import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';

import { colors } from '../ui';
import { nativeDriver } from './motion';

const SLOTS = [
  ['9:00', '9:30', '11:00', '12:30'],
  ['10:00', '10:30', '13:00', '16:30'],
  ['9:30', '12:00', '17:00', '18:30'],
];

/** Los próximos tres días hábiles a partir de mañana. */
function nextDays() {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
const dayLong = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

/** Demostración interactiva de cómo se agenda (no crea citas reales). */
export function BookingDemo() {
  const [days] = useState(nextDays);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'paying' | 'done'>('idle');
  const [pop] = useState(() => new Animated.Value(0));

  function pay() {
    setState('paying');
    setTimeout(() => {
      setState('done');
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: nativeDriver }).start();
    }, 900);
  }

  function reset() {
    setSlot(null);
    setState('idle');
  }

  return (
    <View style={styles.card}>
      <View style={styles.demoTag}>
        <Text style={styles.demoTagText}>Pruébalo · es una demostración</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 24 }}>👩‍⚕️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Dra. Ana Pérez</Text>
          <Text style={styles.small}>Pediatría · Guadalajara · 30 min</Text>
        </View>
      </View>

      {state === 'done' ? (
        <Animated.View
          style={[
            styles.success,
            { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
          ]}
        >
          <View style={styles.successIcon}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>✓</Text>
          </View>
          <Text style={styles.name}>¡Cita confirmada!</Text>
          <Text style={[styles.small, { textAlign: 'center' }]}>
            {dayLong.format(days[day])} a las {slot}. Te mandamos un recordatorio un día antes.
          </Text>
          <Pressable onPress={reset} style={{ padding: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Probar otra vez</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {days.map((d, i) => {
              const selected = i === day;
              return (
                <Pressable
                  key={d.toISOString()}
                  onPress={() => {
                    setDay(i);
                    setSlot(null);
                  }}
                  style={[styles.day, selected && { backgroundColor: colors.text, borderColor: colors.text }]}
                >
                  <Text style={[styles.dayName, selected && { color: colors.primaryLight }]}>
                    {weekday.format(d).replace('.', '')}
                  </Text>
                  <Text style={[styles.dayNumber, selected && { color: '#fff' }]}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SLOTS[day].map((s) => {
              const selected = s === slot;
              return (
                <Pressable key={s} onPress={() => setSlot(s)} style={[styles.slot, selected && styles.slotSelected]}>
                  <Text style={{ fontWeight: '700', color: selected ? '#fff' : colors.primary }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={pay}
            disabled={!slot || state === 'paying'}
            style={({ pressed }) => [styles.payButton, (!slot || pressed) && { opacity: 0.5 }]}
          >
            {state === 'paying' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {slot ? `Pagar $600 y agendar a las ${slot}` : 'Elige un horario'}
              </Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = {
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.16,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  demoTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  demoTagText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  small: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dayName: { fontSize: 13, color: colors.muted, textTransform: 'capitalize' },
  dayNumber: { fontSize: 20, fontWeight: '800', color: colors.text },
  slot: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  slotSelected: { backgroundColor: colors.primary },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  success: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2F855A',
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;
