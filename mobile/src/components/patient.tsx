import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, MAX_WIDTH } from '@/components/ui';
import { fonts } from '@/lib/webFonts';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Encabezado grande con título en serif, en lugar de la barra de navegación. */
export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
      <View style={[styles.blob, { width: 280, height: 280, top: -140, right: -80, backgroundColor: colors.primaryLight }]} />
      <View style={[styles.blob, { width: 160, height: 160, top: 10, right: 140, backgroundColor: '#FDEBB8', opacity: 0.6 }]} />
      <View style={styles.headerInner}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const AVATAR_COLORS = [
  ['#FBE6DA', '#B4532A'],
  ['#FDEBB8', '#8A5A00'],
  ['#DDEBD9', '#3F6B3A'],
  ['#E6E1F5', '#5B4B8A'],
];

/** Iniciales sobre un color cálido que depende del nombre. */
export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const clean = name.replace(/^(dr|dra|lic)\.?\s+/i, '');
  const initials = clean
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const [bg, fg] = AVATAR_COLORS[[...clean].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontWeight: '800', fontSize: size * 0.34, fontFamily: fonts.sans }}>{initials}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'danger'; icon?: IconName }) {
  const palette = {
    neutral: ['#F3EAE3', colors.muted],
    primary: [colors.primaryLight, colors.primary],
    success: ['#E3F1E7', '#2F6B45'],
    danger: ['#FDECEA', colors.danger],
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      {icon && <Feather name={icon} size={12} color={palette[1]} />}
      <Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

/** Fila de menú con ícono y flecha. */
export function ActionRow({ icon, label, onPress, danger = false, last = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
        ((state as { hovered?: boolean }).hovered || state.pressed) && { backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.rowIcon, danger && { backgroundColor: '#FDECEA' }]}>
        <Feather name={icon} size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

export const text = StyleSheet.create({
  h2: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.text, fontFamily: fonts.sans },
  body: { fontSize: 15, color: colors.text, fontFamily: fonts.sans, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted, fontFamily: fonts.sans, lineHeight: 20 },
});

const styles = StyleSheet.create({
  header: { overflow: 'hidden', paddingBottom: 20, backgroundColor: colors.background },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.9 },
  headerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, gap: 6 },
  eyebrow: { color: colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: fonts.sans },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: colors.muted, fontFamily: fonts.sans },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '700', fontFamily: fonts.sans },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, textAlign: 'center' },
  emptyText: { fontSize: 15, color: colors.muted, fontFamily: fonts.sans, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', fontFamily: fonts.sans },
});
