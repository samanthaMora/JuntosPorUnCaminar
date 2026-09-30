import Feather from '@expo/vector-icons/Feather';
import { Link, router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BookingDemo } from './landing/BookingDemo';
import { Accordion, FadeIn, LiftCard, Marquee, RotatingWord } from './landing/motion';
import { colors } from './ui';

const CONTENT_WIDTH = 1120;

const SPECIALISTS = ['tu pediatra', 'tu dentista', 'tu psicóloga', 'tu nutriólogo', 'tu ginecóloga', 'tu dermatólogo'];

const SPECIALTIES = [
  'Pediatría',
  'Odontología',
  'Psicología',
  'Nutrición',
  'Ginecología',
  'Medicina general',
  'Dermatología',
  'Cardiología',
  'Oftalmología',
  'Traumatología',
];

type IconName = ComponentProps<typeof Feather>['name'];

const TRUST: [IconName, string][] = [
  ['lock', 'Pago seguro con Stripe'],
  ['shield', 'Cédula revisada'],
  ['rotate-ccw', 'Reembolso si cancelas a tiempo'],
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Encuentra a tu doctor', text: 'Busca por nombre, especialidad o ciudad, o usa el código que te compartió.' },
  { icon: 'calendar', title: 'Elige tu horario', text: 'Ve los días y horas libres de las próximas tres semanas y aparta el que te acomode.' },
  { icon: 'credit-card', title: 'Paga y listo', text: 'Pagas en línea con tarjeta y tu cita queda confirmada al momento.' },
];

const AUDIENCES = {
  patient: {
    title: 'Deja de llamar al consultorio.',
    cta: 'Crear mi cuenta',
    role: undefined,
    points: [
      ['calendar', 'Ve la agenda real de tu doctor y aparta en segundos, a cualquier hora.'],
      ['refresh-cw', 'Cambia o cancela desde la app, con reembolso si lo haces a tiempo.'],
      ['bell', 'Recibe un recordatorio un día antes de tu cita.'],
      ['list', 'Todas tus citas, pasadas y próximas, en un solo lugar.'],
    ],
  },
  doctor: {
    title: 'Llena tu agenda y cobra sin perseguir a nadie.',
    cta: 'Crear mi consultorio',
    role: 'doctor',
    points: [
      ['clock', 'Publica tus horarios y días libres en minutos.'],
      ['check-circle', 'Tus pacientes pagan al agendar: menos citas perdidas.'],
      ['dollar-sign', 'El dinero llega directo a tu cuenta bancaria.'],
      ['share-2', 'Comparte tu código y te encuentran al instante.'],
    ],
  },
} as const;

const FAQ = [
  {
    q: '¿Cuánto cuesta usar goodates?',
    a: 'Para pacientes es gratis: solo pagas el precio de la consulta que fija tu doctor.',
  },
  {
    q: '¿Puedo cambiar o cancelar mi cita?',
    a: 'Sí, desde "Mis citas", hasta el límite de horas antes de la cita que marca cada doctor. Si cancelas a tiempo, te devolvemos el pago completo.',
  },
  {
    q: '¿Qué pasa si el doctor cancela?',
    a: 'Te reembolsamos el pago completo automáticamente y te avisamos.',
  },
  {
    q: '¿Cómo sé que el doctor es real?',
    a: 'Antes de que un doctor aparezca en las búsquedas, revisamos su cédula profesional en el Registro Nacional de Profesionistas.',
  },
  {
    q: 'Soy doctor, ¿cómo recibo mis pagos?',
    a: 'Das de alta tu cuenta de cobro con Stripe (identificación, RFC y CLABE). Por cada consulta, Stripe deposita el pago en tu cuenta bancaria, menos la comisión de la plataforma.',
  },
];

/** Portada para quien todavía no inicia sesión. */
export function Landing() {
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [audience, setAudience] = useState<keyof typeof AUDIENCES>('patient');
  const current = AUDIENCES[audience];

  const signUp = (role?: string) => router.push({ pathname: '/sign-up', params: role ? { rol: role } : {} });

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Portada */}
      <View style={{ overflow: 'hidden' }}>
        <View style={[styles.blob, { width: 520, height: 520, top: -180, right: -140, backgroundColor: colors.primaryLight }]} />
        <View style={[styles.blob, { width: 260, height: 260, top: 340, left: -120, backgroundColor: '#FDEFC7' }]} />

        <Section>
          <View style={styles.nav}>
            <Wordmark />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {wide && (
                <Pressable onPress={() => signUp('doctor')} style={{ padding: 8 }}>
                  <Text style={styles.navLinkMuted}>Soy doctor</Text>
                </Pressable>
              )}
              <Link href="/sign-in" style={styles.navButton}>
                Iniciar sesión
              </Link>
            </View>
          </View>
        </Section>

        <Section>
          <View style={[styles.hero, wide && { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={[styles.heroText, wide && { flex: 1.1 }]}>
              <FadeIn>
                <View style={styles.pill}>
                  <View style={styles.pulse} />
                  <Text style={styles.pillText}>Citas médicas en línea, confirmadas al momento</Text>
                </View>
              </FadeIn>
              <FadeIn delay={100}>
                <Text style={[styles.h1, wide && styles.h1Wide]}>Agenda con</Text>
                <RotatingWord words={SPECIALISTS} style={[styles.h1, wide && styles.h1Wide, { color: colors.primary }]} />
                <Text style={[styles.h1, wide && styles.h1Wide]}>en menos de un minuto.</Text>
              </FadeIn>
              <FadeIn delay={200}>
                <Text style={styles.lead}>
                  Encuentra a tu doctor, elige el horario que te acomode y paga en línea. Sin llamadas, sin
                  filas y sin esperar a que te devuelvan el mensaje.
                </Text>
              </FadeIn>
              <FadeIn delay={300}>
                <View style={styles.ctaRow}>
                  <Cta title="Agendar una cita" onPress={() => signUp()} />
                  <Cta title="Soy doctor" variant="outline" onPress={() => signUp('doctor')} />
                </View>
              </FadeIn>
              <FadeIn delay={400}>
                <View style={styles.trustRow}>
                  {TRUST.map(([icon, text]) => (
                    <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name={icon} size={14} color={colors.primary} />
                      <Text style={styles.trust}>{text}</Text>
                    </View>
                  ))}
                </View>
              </FadeIn>
            </View>
            <FadeIn delay={250} style={[wide ? { flex: 1, alignItems: 'flex-end' } : { alignItems: 'center' }]}>
              <BookingDemo />
            </FadeIn>
          </View>
        </Section>
      </View>

      {/* Especialidades */}
      <View style={{ paddingVertical: 28, gap: 16 }}>
        <Text style={[styles.caption, { textAlign: 'center' }]}>Encuentra especialistas en</Text>
        <Marquee items={SPECIALTIES} />
      </View>

      {/* Cómo funciona */}
      <Section tint>
        <View style={{ gap: 8 }}>
          <Text style={styles.eyebrow}>Cómo funciona</Text>
          <Text style={styles.h2}>Tu cita en tres pasos</Text>
        </View>
        <View style={[styles.grid, wide && { flexDirection: 'row' }]}>
          {STEPS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 120} style={wide && { flex: 1 }}>
              <LiftCard style={styles.tile}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={styles.iconBubble}>
                    <Feather name={s.icon} size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.stepIndex}>0{i + 1}</Text>
                </View>
                <Text style={styles.h3}>{s.title}</Text>
                <Text style={styles.body}>{s.text}</Text>
              </LiftCard>
            </FadeIn>
          ))}
        </View>
      </Section>

      {/* Pacientes / doctores */}
      <Section>
        <View style={{ alignItems: 'center', gap: 20 }}>
          <View style={styles.segment}>
            {(['patient', 'doctor'] as const).map((key) => (
              <Pressable
                key={key}
                onPress={() => setAudience(key)}
                style={[styles.segmentItem, audience === key && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, audience === key && { color: '#fff' }]}>
                  {key === 'patient' ? 'Para pacientes' : 'Para doctores'}
                </Text>
              </Pressable>
            ))}
          </View>

          <FadeIn key={audience} style={{ width: '100%' }}>
            <View style={[styles.audience, wide && { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={[{ gap: 20 }, wide && { flex: 1 }]}>
                <Text style={[styles.h2, { color: '#fff' }]}>{current.title}</Text>
                <View style={{ alignSelf: 'flex-start' }}>
                  <Cta title={current.cta} variant="light" onPress={() => signUp(current.role)} />
                </View>
              </View>
              <View style={[{ gap: 12 }, wide && { flex: 1 }]}>
                {current.points.map(([icon, text]) => (
                  <View key={text} style={styles.point}>
                    <Feather name={icon as IconName} size={20} color="#fff" />
                    <Text style={[styles.body, { color: '#fff', flex: 1 }]}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeIn>
        </View>
      </Section>

      {/* Preguntas frecuentes */}
      <Section>
        <View style={[{ gap: 24 }, wide && { flexDirection: 'row', gap: 64 }]}>
          <View style={[{ gap: 8 }, wide && { flex: 0.8 }]}>
            <Text style={styles.eyebrow}>Dudas</Text>
            <Text style={styles.h2}>Preguntas frecuentes</Text>
            <Text style={styles.body}>¿No encuentras lo que buscas? Escríbenos desde tu perfil en la app.</Text>
          </View>
          <View style={wide && { flex: 1.2 }}>
            {FAQ.map((item) => (
              <Accordion key={item.q} question={item.q} answer={item.a} />
            ))}
          </View>
        </View>
      </Section>

      {/* Llamado final */}
      <Section>
        <View style={styles.finalCta}>
          <Text style={[styles.h2, { textAlign: 'center' }]}>¿Listo para tu próxima consulta?</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>Crear tu cuenta toma menos de un minuto.</Text>
          <View style={[styles.ctaRow, { justifyContent: 'center' }]}>
            <Cta title="Empezar ahora" onPress={() => signUp()} />
            <Cta title="Ya tengo cuenta" variant="outline" onPress={() => router.push('/sign-in')} />
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
      <View style={[styles.section, tint && { paddingVertical: 56 }]}>{children}</View>
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
      style={(state) => {
        const hovered = (state as { hovered?: boolean }).hovered;
        return [
          styles.cta,
          variant === 'solid' && { backgroundColor: hovered ? '#9A4422' : colors.primary },
          variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: hovered ? colors.primaryLight : 'transparent' },
          variant === 'light' && { backgroundColor: hovered ? colors.primaryLight : '#fff' },
          state.pressed && { transform: [{ scale: 0.97 }] },
        ];
      }}
    >
      <Text style={[styles.ctaText, { color: variant === 'solid' ? '#fff' : colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 32, gap: 24 },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.8 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navLinkMuted: { color: colors.text, fontWeight: '600', fontSize: 15 },
  navButton: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordmark: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  hero: { gap: 40, paddingBottom: 24 },
  heroText: { gap: 20 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2F855A' },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  h1: { fontSize: 40, lineHeight: 46, fontWeight: '800', color: colors.text, letterSpacing: -1.2 },
  h1Wide: { fontSize: 60, lineHeight: 66, letterSpacing: -2 },
  h2: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  h3: { fontSize: 19, fontWeight: '700', color: colors.text },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  caption: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  lead: { fontSize: 18, lineHeight: 28, color: colors.muted, maxWidth: 540 },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cta: { borderRadius: 999, paddingVertical: 15, paddingHorizontal: 26 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
  trust: { color: colors.muted, fontSize: 14, fontWeight: '500' },
  grid: { gap: 16 },
  tile: { backgroundColor: colors.card, borderRadius: 24, padding: 28, gap: 12 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndex: { fontSize: 32, fontWeight: '800', color: colors.primaryLight },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999 },
  segmentItemActive: { backgroundColor: colors.text },
  segmentText: { fontWeight: '700', color: colors.text, fontSize: 15 },
  audience: { backgroundColor: colors.primary, borderRadius: 32, padding: 36, gap: 32 },
  point: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
  },
  finalCta: {
    backgroundColor: colors.primaryLight,
    borderRadius: 32,
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  footerLink: { color: colors.muted, fontSize: 14 },
});
