import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Avatar, EmptyState, PageHeader, Pill, text } from '@/components/patient';
import { colors, MAX_WIDTH } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { fonts } from '@/lib/webFonts';

type Result = {
  id: string;
  full_name: string;
  public_code: string;
  specialty: string;
  city: string;
  price_cents: number;
  currency: string;
};

type NextAppointment = { starts_at: string; doctors: { timezone: string; profiles: { full_name: string } } };

const SPECIALTIES = ['Medicina general', 'Pediatría', 'Psicología', 'Odontología', 'Nutrición', 'Ginecología', 'Cardiología', 'Dermatología'];

export default function Search() {
  const { session, profile } = useAuth();
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 2 : 1;
  const cardWidth = (Math.min(width, MAX_WIDTH) - 40 - 14) / 2;
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [next, setNext] = useState<NextAppointment | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('search_doctors', { p_query: query });
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Próxima cita confirmada, para mostrarla arriba.
  useFocusEffect(
    useCallback(() => {
      supabase
        .from('appointments')
        .select('starts_at, doctors(timezone, profiles(full_name))')
        .eq('patient_id', session!.user.id)
        .eq('status', 'confirmed')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(1)
        .then(({ data }) => setNext(((data as unknown as NextAppointment[]) ?? [])[0] ?? null));
    }, [session]),
  );

  const firstName = profile?.full_name.split(/\s+/)[0] ?? '';

  const header = (
    <View style={{ gap: 18 }}>
      {next && (
        <Pressable onPress={() => router.push('/appointments')} style={styles.next}>
          <View style={styles.nextIcon}>
            <Feather name="calendar" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.nextLabel}>Tu próxima cita</Text>
            <Text style={styles.nextText} numberOfLines={1}>
              {next.doctors.profiles.full_name} · {formatDateTime(next.starts_at, next.doctors.timezone)}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#fff" />
        </Pressable>
      )}

      <View style={[styles.search, focused && styles.searchFocused]}>
        <Feather name="search" size={20} color={focused ? colors.primary : colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nombre, especialidad, ciudad o código"
          placeholderTextColor="#B5A39A"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Feather name="x-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SPECIALTIES.map((s) => {
          const on = query.toLowerCase() === s.toLowerCase();
          return (
            <Pressable key={s} onPress={() => setQuery(on ? '' : s)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {results && results.length > 0 && (
        <Text style={text.muted}>
          {results.length === 1 ? '1 doctor' : `${results.length} doctores`}
          {query ? ` para "${query}"` : ' disponibles'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        key={columns}
        numColumns={columns}
        data={results ?? []}
        keyExtractor={(d) => d.id}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            <PageHeader
              eyebrow={firstName ? `Hola, ${firstName}` : 'Hola'}
              title="¿Con quién quieres agendar?"
              subtitle="Encuentra a tu doctor y aparta tu cita en segundos."
            />
            <View style={styles.body}>{header}</View>
          </>
        }
        ListEmptyComponent={
          results ? (
            <View style={styles.body}>
              <EmptyState
                icon="search"
                title="Sin resultados"
                text="No encontramos doctores con esa búsqueda. Prueba con otra especialidad, ciudad o el código que te compartieron."
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1, maxWidth: cardWidth } : styles.itemWrap}>
            <Pressable
              onPress={() => router.push({ pathname: '/doctor/[code]', params: { code: item.public_code } })}
              style={(state) => [
                styles.doctor,
                ((state as { hovered?: boolean }).hovered || state.pressed) && styles.doctorActive,
                Platform.OS === 'web' && ({ transitionDuration: '200ms' } as object),
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Avatar name={item.full_name} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={text.h3} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  {!!item.specialty && <Pill label={item.specialty} tone="primary" />}
                </View>
              </View>
              <View style={styles.doctorFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {!!item.city && (
                    <>
                      <Feather name="map-pin" size={14} color={colors.muted} />
                      <Text style={text.muted} numberOfLines={1}>
                        {item.city}
                      </Text>
                    </>
                  )}
                </View>
                <Text style={styles.price}>{formatMoney(item.price_cents, item.currency)}</Text>
              </View>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>Ver horarios</Text>
                <Feather name="arrow-right" size={16} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  itemWrap: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  row: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 14, gap: 14 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.text,
    borderRadius: 22,
    padding: 16,
  },
  nextIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  nextLabel: { color: colors.primaryLight, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.sans },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: fonts.sans },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  searchFocused: { borderColor: colors.primary },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.sans,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 9, paddingHorizontal: 16 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontWeight: '600', color: colors.text, fontSize: 14, fontFamily: fonts.sans },
  doctor: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doctorActive: {
    borderColor: colors.primary,
    transform: [{ translateY: -3 }],
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  doctorFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: colors.text, fontFamily: fonts.sans },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 12,
  },
  ctaText: { color: colors.primary, fontWeight: '700', fontSize: 15, fontFamily: fonts.sans },
});
