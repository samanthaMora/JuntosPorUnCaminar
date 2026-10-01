import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { FadeIn } from '@/components/landing/motion';
import { colors } from '@/components/ui';
import { fonts } from '@/lib/webFonts';

/** Tarjeta centrada con el estilo de la pantalla de acceso. */
export function AuthShell({
  title,
  subtitle,
  back = { label: 'Iniciar sesión', href: '/sign-in' },
  children,
}: {
  title: string;
  subtitle?: string;
  back?: { label: string; href: Href };
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.blob, { width: 420, height: 420, top: -140, right: -120, backgroundColor: colors.primaryLight }]} />
        <View style={[styles.blob, { width: 300, height: 300, bottom: -100, left: -100, backgroundColor: '#FDEBB8' }]} />
        <FadeIn style={styles.card}>
          <View style={styles.top}>
            <Pressable onPress={() => router.replace(back.href)} hitSlop={8} style={styles.back}>
              <Feather name="arrow-left" size={15} color={colors.muted} />
              <Text style={styles.backText}>{back.label}</Text>
            </Pressable>
            <Text style={styles.wordmark}>
              good<Text style={{ color: colors.primary }}>dates</Text>
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ShellField({ label, right, ...props }: TextInputProps & { label: string; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.input, focused && styles.inputFocused]}>
        <TextInput
          placeholderTextColor="#B5A39A"
          style={styles.inputText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

export function ShellButton({
  title,
  onPress,
  busy = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={(state) => [
        styles.button,
        primary ? { backgroundColor: colors.primary } : styles.buttonSecondary,
        (state as { hovered?: boolean }).hovered && { opacity: 0.9 },
        state.pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? '#fff' : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ShellMessage({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const [bg, fg, icon] = {
    error: ['#FDECEA', colors.danger, 'alert-circle'],
    success: ['#E3F1E7', '#256D46', 'check-circle'],
    info: [colors.background, colors.muted, 'mail'],
  }[tone] as [string, string, 'alert-circle' | 'check-circle' | 'mail'];
  return (
    <FadeIn>
      <View style={[styles.message, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={fg} style={{ marginTop: 2 }} />
        <Text style={[styles.messageText, { color: fg }]}>{children}</Text>
      </View>
    </FadeIn>
  );
}

export const shellStyles = StyleSheet.create({
  show: { color: colors.primary, fontWeight: '700', fontSize: 13, fontFamily: fonts.sans },
  link: { color: colors.primary, fontWeight: '700', fontFamily: fonts.sans },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22, fontFamily: fonts.sans },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingVertical: 40, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.8 },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.14,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
    elevation: 8,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.muted, fontWeight: '600', fontSize: 14, fontFamily: fonts.sans },
  wordmark: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted, fontFamily: fonts.sans },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fonts.sans },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.card },
  inputText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.sans,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  button: { borderRadius: 999, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  buttonSecondary: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  buttonText: { fontWeight: '700', fontSize: 16, fontFamily: fonts.sans },
  message: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14 },
  messageText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.sans },
});
