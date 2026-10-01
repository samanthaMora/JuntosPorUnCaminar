import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, PageHeader, Pill, text } from '@/components/patient';
import { colors, MAX_WIDTH } from '@/components/ui';
import { Alert } from '@/lib/alert';
import { useAuth } from '@/lib/auth';
import { changeDeadline, formatDateTime, formatMoney, formatTime } from '@/lib/format';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Appointment } from '@/lib/types';
import { fonts } from '@/lib/webFonts';

type Row = Appointment & {
  doctors: { public_code: string; change_cutoff_hours: number; timezone: string; profiles: { full_name: string } };
};

function part(date: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-MX', { timeZone, ...options }).format(new Date(date)).replace('.', '');
}

/** "Hoy", "Mañana" o "En 5 días". */
function relativeDay(date: string, timeZone: string) {
  const key = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
  const days = Math.round((Date.parse(key(new Date(date))) - Date.parse(key(new Date()))) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

export default function MyAppointments() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fetchRows = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*, doctors(public_code, change_cutoff_hours, timezone, profiles(full_name))')
        .eq('patient_id', session!.user.id)
        .in('status', ['confirmed', 'cancelled', 'pending_payment'])
        .order('starts_at', { ascending: false });
      return (data as Row[]) ?? [];
    };
    const first = await fetchRows();
    setRows(first);

    // Si alguna sigue esperando pago, se revisa con Stripe por si el aviso no llegó.
    const pending = first.filter((r) => r.status === 'pending_payment');
    if (pending.length === 0) return;
    await Promise.all(
      pending.map((r) => invokeFunction('confirm-booking', { appointment_id: r.id }).catch(() => null)),
    );
    setRows(await fetchRows());
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
  const upcoming = (rows ?? []).filter((r) => r.status === 'confirmed' && new Date(r.ends_at) > now).reverse();
  const history = (rows ?? []).filter((r) => !upcoming.includes(r));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <PageHeader
        eyebrow="Mis citas"
        title={upcoming.length ? `Tienes ${upcoming.length === 1 ? '1 cita' : `${upcoming.length} citas`}` : 'Tus citas'}
        subtitle={upcoming.length ? 'Aquí puedes cambiarlas o cancelarlas a tiempo.' : undefined}
      />
      <View style={styles.body}>
        {!rows && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

        {rows && upcoming.length === 0 && (
          <View style={styles.card}>
            <EmptyState
              icon="calendar"
              title="No tienes citas próximas"
              text="Cuando agendes una cita, aparecerá aquí con todos sus detalles."
              action={
                <Pressable onPress={() => router.push('/search')} style={styles.primaryButton}>
                  <Feather name="search" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>Buscar doctor</Text>
                </Pressable>
              }
            />
          </View>
        )}

        {upcoming.map((row) => {
          const tz = row.doctors.timezone;
          const deadline = changeDeadline(row.starts_at, row.doctors.change_cutoff_hours);
          const canChange = now < deadline;
          const soon = relativeDay(row.starts_at, tz);
          return (
            <View key={row.id} style={styles.card}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={styles.date}>
                  <Text style={styles.dateWeekday}>{part(row.starts_at, tz, { weekday: 'short' })}</Text>
                  <Text style={styles.dateDay}>{part(row.starts_at, tz, { day: 'numeric' })}</Text>
                  <Text style={styles.dateMonth}>{part(row.starts_at, tz, { month: 'short' })}</Text>
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Pill label={soon} tone={soon === 'Hoy' || soon === 'Mañana' ? 'primary' : 'neutral'} />
                    <Pill label="Pagada" tone="success" icon="check" />
                  </View>
                  <Text style={text.h3}>{row.doctors.profiles.full_name}</Text>
                  <View style={styles.meta}>
                    <Feather name="clock" size={14} color={colors.muted} />
                    <Text style={text.muted}>{formatTime(row.starts_at, tz)}</Text>
                    <Text style={text.muted}>·</Text>
                    <Text style={text.muted}>{formatMoney(row.price_cents, row.currency)}</Text>
                  </View>
                </View>
              </View>

              {canChange ? (
                <>
                  <View style={styles.notice}>
                    <Feather name="info" size={14} color={colors.muted} />
                    <Text style={[text.muted, { flex: 1, fontSize: 13 }]}>
                      Puedes cambiarla o cancelarla hasta el {formatDateTime(deadline, tz)}.
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/reschedule/[id]', params: { id: row.id } })}
                      style={[styles.action, { backgroundColor: colors.primaryLight }]}
                    >
                      <Feather name="repeat" size={16} color={colors.primary} />
                      <Text style={[styles.actionText, { color: colors.primary }]}>Cambiar</Text>
                    </Pressable>
                    <Pressable onPress={() => cancel(row)} disabled={busyId === row.id} style={[styles.action, styles.actionDanger]}>
                      {busyId === row.id ? (
                        <ActivityIndicator color={colors.danger} />
                      ) : (
                        <>
                          <Feather name="x" size={16} color={colors.danger} />
                          <Text style={[styles.actionText, { color: colors.danger }]}>Cancelar</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.notice}>
                  <Feather name="lock" size={14} color={colors.muted} />
                  <Text style={[text.muted, { flex: 1, fontSize: 13 }]}>
                    Ya no se puede cambiar ni cancelar: el límite es {row.doctors.change_cutoff_hours} h antes de la cita.
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {history.length > 0 && (
          <>
            <Text style={[text.h2, { marginTop: 16 }]}>Historial</Text>
            <View style={[styles.card, { padding: 0, gap: 0 }]}>
              {history.map((row, i) => {
                const status =
                  row.status === 'cancelled'
                    ? row.refunded_at
                      ? { label: 'Reembolsada', tone: 'neutral' as const }
                      : { label: 'Cancelada', tone: 'danger' as const }
                    : row.status === 'pending_payment'
                      ? { label: 'Esperando pago', tone: 'primary' as const }
                      : { label: 'Realizada', tone: 'success' as const };
                return (
                  <View key={row.id} style={[styles.historyRow, i < history.length - 1 && styles.divider]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[text.body, { fontWeight: '600' }]}>{row.doctors.profiles.full_name}</Text>
                      <Text style={[text.muted, { fontSize: 13 }]}>{formatDateTime(row.starts_at, row.doctors.timezone)}</Text>
                    </View>
                    <Pill label={status.label} tone={status.tone} />
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  date: {
    width: 64,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateWeekday: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', textTransform: 'capitalize', fontFamily: fonts.sans },
  dateDay: { color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: fonts.sans, lineHeight: 30 },
  dateMonth: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', textTransform: 'capitalize', fontFamily: fonts.sans },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 13,
    minHeight: 46,
  },
  actionDanger: { borderWidth: 1.5, borderColor: '#F3C9C4' },
  actionText: { fontWeight: '700', fontSize: 15, fontFamily: fonts.sans },
  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 22,
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: fonts.sans },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
