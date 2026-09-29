import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors } from './ui';

const CONTENT_WIDTH = 1080;

const STEPS = [
  { n: '1', title: 'Encuentra a tu doctor', text: 'Busca por nombre, especialidad o ciudad, o usa el código que te compartió.' },
  { n: '2', title: 'Elige tu horario', text: 'Ve los días y horas libres de las próximas tres semanas y aparta el que te acomode.' },
  { n: '3', title: 'Paga y listo', text: 'Pagas en línea con tarjeta y tu cita queda confirmada al momento.' },
];

const PROMISES = [
  { icon: '🔒', title: 'Pago seguro', text: 'Los cobros los procesa Stripe; nunca guardamos tu tarjeta.' },
  { icon: '🩺', title: 'Doctores con cédula', text: 'Revisamos la cédula profesional antes de que un doctor aparezca.' },
  { icon: '↩️', title: 'Cambios sin pena', text: 'Cambia o cancela con reembolso dentro del plazo que marca tu doctor.' },
];

const FOR_DOCTORS = [
  'Publica tus horarios y días libres en minutos.',
  'Tus pacientes pagan al agendar: menos citas perdidas.',
  'El dinero llega directo a tu cuenta bancaria.',
  'Comparte tu código y te encuentran al instante.',
];

/** Portada para quien todavía no inicia sesión. */
export function Landing() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1 }}>
      <Section>
        <View style={styles.nav}>
          <Wordmark />
          <Link href="/sign-in" style={styles.navLink}>
            Iniciar sesión
          </Link>
        </View>
      </Section>

      <Section>
        <View style={[styles.hero, wide && { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={[styles.heroText, wide && { flex: 1 }]}>
            <Text style={styles.eyebrow}>Citas médicas en línea</Text>
            <Text style={[styles.h1, wide && { fontSize: 52, lineHeight: 58 }]}>
              Tu consulta, sin vueltas ni esperas.
            </Text>
            <Text style={styles.lead}>
              Encuentra a tu doctor, elige un horario que te acomode y paga en línea. Tu cita queda confirmada
              al instante.
            </Text>
            <View style={styles.ctaRow}>
              <Cta title="Agendar una cita" onPress={() => router.push('/sign-up')} />
              <Cta
                title="Soy doctor"
                variant="outline"
                onPress={() => router.push({ pathname: '/sign-up', params: { rol: 'doctor' } })}
              />
            </View>
          </View>
          <View style={[wide ? { flex: 1, alignItems: 'flex-end' } : { alignItems: 'center' }]}>
            <BookingPreview />
          </View>
        </View>
      </Section>

      <Section tint>
        <Text style={styles.h2}>Así de fácil</Text>
        <View style={[styles.grid, wide && { flexDirection: 'row' }]}>
          {STEPS.map((s) => (
            <View key={s.n} style={[styles.tile, wide && { flex: 1 }]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{s.n}</Text>
              </View>
              <Text style={styles.h3}>{s.title}</Text>
              <Text style={styles.body}>{s.text}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section>
        <View style={[styles.grid, wide && { flexDirection: 'row' }]}>
          {PROMISES.map((p) => (
            <View key={p.title} style={[styles.promise, wide && { flex: 1 }]}>
              <Text style={{ fontSize: 28 }}>{p.icon}</Text>
              <Text style={styles.h3}>{p.title}</Text>
              <Text style={styles.body}>{p.text}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section>
        <View style={[styles.doctors, wide && { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={[{ gap: 12 }, wide && { flex: 1 }]}>
            <Text style={[styles.eyebrow, { color: colors.primaryLight }]}>Para doctores</Text>
            <Text style={[styles.h2, { color: '#fff' }]}>Llena tu agenda y cobra sin perseguir a nadie.</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <Cta
                title="Crear mi consultorio"
                variant="light"
                onPress={() => router.push({ pathname: '/sign-up', params: { rol: 'doctor' } })}
              />
            </View>
          </View>
          <View style={[{ gap: 12 }, wide && { flex: 1 }]}>
            {FOR_DOCTORS.map((line) => (
              <View key={line} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Text style={styles.check}>✓</Text>
                <Text style={[styles.body, { color: '#fff', flex: 1 }]}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      <Section>
        <View style={styles.footer}>
          <Wordmark small />
          <Link href="/privacy" style={styles.footerLink}>
            Aviso de privacidad
          </Link>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ children, tint = false }: { children: ReactNode; tint?: boolean }) {
  return (
    <View style={tint ? { backgroundColor: colors.primaryLight } : undefined}>
      <View style={styles.section}>{children}</View>
    </View>
  );
}

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Text style={[styles.wordmark, small && { fontSize: 18 }]}>
      good<Text style={{ color: colors.primary }}>dates</Text>
    </Text>
  );
}

function Cta({
  title,
  onPress,
  variant = 'solid',
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'light';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        variant === 'solid' && { backgroundColor: colors.primary },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        variant === 'light' && { backgroundColor: '#fff' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.ctaText, { color: variant === 'solid' ? '#fff' : colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

/** Tarjeta de ejemplo que muestra cómo se ve agendar. */
function BookingPreview() {
  const slots = ['9:00', '9:30', '10:30', '12:00'];
  return (
    <View style={styles.preview}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 22 }}>👩‍⚕️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.h3}>Dra. Ana Pérez</Text>
          <Text style={styles.small}>Pediatría · Guadalajara</Text>
        </View>
      </View>
      <Text style={[styles.small, { fontWeight: '600', color: colors.text }]}>Martes 14 de octubre</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {slots.map((s, i) => (
          <View key={s} style={[styles.slot, i === 1 && { backgroundColor: colors.primary }]}>
            <Text style={{ fontWeight: '600', color: i === 1 ? '#fff' : colors.primary }}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={styles.previewButton}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Pagar $600 y agendar</Text>
      </View>
      <View style={styles.badge}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>✓ Cita confirmada</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 28, gap: 20 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navLink: { color: colors.primary, fontWeight: '600', fontSize: 16, padding: 8 },
  wordmark: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  hero: { gap: 32 },
  heroText: { gap: 16 },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' },
  h1: { fontSize: 38, lineHeight: 44, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  h2: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '700', color: colors.text },
  lead: { fontSize: 18, lineHeight: 27, color: colors.muted, maxWidth: 520 },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  small: { fontSize: 14, color: colors.muted },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  cta: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  grid: { gap: 16 },
  tile: { backgroundColor: colors.card, borderRadius: 20, padding: 24, gap: 10 },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  promise: { gap: 8, paddingVertical: 8 },
  doctors: { backgroundColor: colors.primary, borderRadius: 28, padding: 32, gap: 28 },
  check: { color: colors.primaryLight, fontWeight: '800', fontSize: 18, lineHeight: 24 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  footerLink: { color: colors.muted, fontSize: 14 },
  preview: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: { borderWidth: 1, borderColor: colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  previewButton: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
