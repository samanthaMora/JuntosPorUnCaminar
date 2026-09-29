import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

// Paleta cálida: terracota sobre crema.
export const colors = {
  primary: '#B4532A',
  primaryLight: '#FBE6DA',
  text: '#2B1D16',
  muted: '#76625A',
  border: '#EFE1D6',
  background: '#FFF9F4',
  card: '#FFFFFF',
  danger: '#B42318',
};

/** Ancho máximo del contenido para que no se estire en pantallas grandes. */
export const MAX_WIDTH = 720;

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.screen}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screen}>
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonOutline,
        variant === 'danger' && { borderColor: colors.danger },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: isPrimary ? '#fff' : variant === 'danger' ? colors.danger : colors.primary },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card },
  buttonText: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600' },
});

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: checked ? colors.primary : colors.card,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {checked && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}
