import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link, router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { FadeIn, nativeDriver } from '@/components/landing/motion';
import { Checkbox, colors } from '@/components/ui';
import { safeNext } from '@/lib/redirect';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/types';
import { fonts } from '@/lib/webFonts';

export type AuthMode = 'signin' | 'signup';

const ROLES: { key: Role; title: string; text: string }[] = [
  { key: 'patient', title: 'Paciente', text: 'Quiero agendar citas' },
  { key: 'doctor', title: 'Doctor', text: 'Quiero recibir pacientes' },
];

/** Tarjeta única para iniciar sesión o crear cuenta, como paciente o doctor. */
export function AuthCard({
  initialMode,
  initialRole = 'patient',
  next,
}: {
  initialMode: AuthMode;
  initialRole?: Role;
  next?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [tab] = useState(() => new Animated.Value(initialMode === 'signin' ? 0 : 1));
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    Animated.spring(tab, { toValue: mode === 'signin' ? 0 : 1, friction: 8, useNativeDriver: nativeDriver }).start();
  }, [mode, tab]);

  function switchMode(m: AuthMode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  async function signIn() {
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) return setError('Correo o contraseña incorrectos.');

    // La cuenta ya tiene un tipo; si no coincide con lo elegido, se avisa.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile && profile.role !== role) {
      await supabase.auth.signOut();
      return setError(
        profile.role === 'doctor'
          ? 'Esta cuenta está registrada como doctor. Elige "Doctor" para entrar.'
          : 'Esta cuenta está registrada como paciente. Elige "Paciente" para entrar.',
      );
    }
    router.replace(safeNext(next) ?? '/');
  }

  async function signUp() {
    if (!fullName.trim()) return setError('Escribe tu nombre.');
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) return setError('Escribe tu teléfono a 10 dígitos.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!accepted) return setError('Debes aceptar el aviso de privacidad para continuar.');

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role, full_name: fullName.trim(), phone: phone.replace(/\D/g, ''), privacy_accepted: 'true' },
      },
    });
    if (authError) return setError(authError.message);
    if (!data.session) {
      switchMode('signin');
      return setNotice('¡Listo! Te enviamos un correo para confirmar tu cuenta. Después, entra aquí.');
    }
    router.replace(safeNext(next) ?? '/');
  }

  async function submit() {
    if (!email.trim() || !password) return setError('Escribe tu correo y contraseña.');
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await (mode === 'signin' ? signIn() : signUp());
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.blob, { width: 420, height: 420, top: -140, right: -120, backgroundColor: colors.primaryLight }]} />
        <View style={[styles.blob, { width: 300, height: 300, bottom: -100, left: -100, backgroundColor: '#FDEBB8' }]} />

        <FadeIn style={styles.card}>
          <View style={styles.top}>
            <Pressable onPress={() => router.replace('/')} hitSlop={8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="arrow-left" size={15} color={colors.muted} />
                <Text style={styles.back}>Inicio</Text>
              </View>
            </Pressable>
            <Text style={styles.wordmark}>
              good<Text style={{ color: colors.primary }}>dates</Text>
            </Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.title}>{isSignup ? 'Crea tu cuenta' : 'Qué gusto verte'}</Text>
            <Text style={styles.subtitle}>
              {isSignup ? 'Te toma menos de un minuto.' : 'Entra para ver y agendar tus citas.'}
            </Text>
          </View>

          <View style={styles.tabs} onLayout={(e) => setTabWidth((e.nativeEvent.layout.width - 8) / 2)}>
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabPill,
                  {
                    width: tabWidth,
                    transform: [{ translateX: tab.interpolate({ inputRange: [0, 1], outputRange: [0, tabWidth] }) }],
                  },
                ]}
              />
            )}
            {(['signin', 'signup'] as const).map((m) => (
              <Pressable key={m} style={styles.tab} onPress={() => switchMode(m)} aria-selected={mode === m}>
                <Text style={[styles.tabText, mode === m && { color: '#fff' }]}>
                  {m === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={styles.label}>¿Quién eres?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ROLES.map((r) => {
                const selected = role === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => {
                      setRole(r.key);
                      setError(null);
                    }}
                    aria-checked={selected}
                    style={(state) => [
                      styles.role,
                      (state as { hovered?: boolean }).hovered && { borderColor: colors.primary },
                      selected && styles.roleSelected,
                    ]}
                  >
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <View style={[styles.roleIcon, selected && { backgroundColor: colors.primary }]}>
                      {r.key === 'doctor' ? (
                        <MaterialCommunityIcons name="stethoscope" size={20} color={selected ? '#fff' : colors.primary} />
                      ) : (
                        <Feather name="user" size={20} color={selected ? '#fff' : colors.primary} />
                      )}
                    </View>
                    <Text style={styles.roleTitle}>{r.title}</Text>
                    <Text style={styles.roleText}>{r.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 14 }}>
            {isSignup && (
              <FadeIn style={{ gap: 14 }}>
                <AuthField
                  label={role === 'doctor' ? 'Nombre como aparecerá' : 'Nombre completo'}
                  placeholder={role === 'doctor' ? 'Dra. Ana Pérez' : 'Ana Pérez'}
                  value={fullName}
                  onChangeText={setFullName}
                  autoComplete="name"
                />
                <AuthField
                  label="Teléfono"
                  placeholder="10 dígitos"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </FadeIn>
            )}
            <AuthField
              label="Correo"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <AuthField
              label="Contraseña"
              placeholder={isSignup ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
              right={
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Text style={styles.show}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                </Pressable>
              }
            />
            {!isSignup && (
              <Link href="/forgot-password" style={styles.forgot}>
                ¿Olvidaste tu contraseña?
              </Link>
            )}
            {isSignup && (
              <Checkbox checked={accepted} onChange={setAccepted}>
                <Text style={{ color: colors.muted, lineHeight: 20, fontSize: 14 }}>
                  Acepto el{' '}
                  <Link href="/privacy" style={{ color: colors.primary, fontWeight: '600' }}>
                    aviso de privacidad
                  </Link>
                  , incluido el tratamiento de mis datos de salud para agendar y dar seguimiento a mis citas.
                </Text>
              </Checkbox>
            )}
          </View>

          {!!error && (
            <FadeIn>
              <Text style={[styles.message, styles.error]}>{error}</Text>
            </FadeIn>
          )}
          {!!notice && (
            <FadeIn>
              <Text style={[styles.message, styles.notice]}>{notice}</Text>
            </FadeIn>
          )}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={(state) => [
              styles.submit,
              (state as { hovered?: boolean }).hovered && { backgroundColor: '#9A4422' },
              state.pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.submitText}>
                {isSignup ? `Crear cuenta de ${role === 'doctor' ? 'doctor' : 'paciente'}` : 'Entrar'}
              </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </View>
            )}
          </Pressable>

          <Text style={styles.switch}>
            {isSignup ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}
            <Text style={styles.switchLink} onPress={() => switchMode(isSignup ? 'signin' : 'signup')}>
              {isSignup ? 'Inicia sesión' : 'Crea una gratis'}
            </Text>
          </Text>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthField({ label, right, ...props }: TextInputProps & { label: string; right?: ReactNode }) {
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
    gap: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7A3A1C',
    shadowOpacity: 0.14,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
    elevation: 8,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: colors.muted, fontWeight: '600', fontSize: 14, fontFamily: fonts.sans },
  wordmark: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.4 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.text, fontFamily: fonts.serif, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: colors.muted, fontFamily: fonts.sans },
  tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border },
  tabPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: colors.text },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 999 },
  tabText: { fontWeight: '700', fontSize: 15, color: colors.text, fontFamily: fonts.sans },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fonts.sans },
  role: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 4,
    backgroundColor: colors.card,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSelected: { borderColor: colors.primary, backgroundColor: '#FFF4EE' },
  roleTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4, fontFamily: fonts.sans },
  roleText: { fontSize: 13, color: colors.muted, fontFamily: fonts.sans },
  radio: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
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
  show: { color: colors.primary, fontWeight: '700', fontSize: 13, fontFamily: fonts.sans },
  forgot: { alignSelf: 'flex-end', color: colors.primary, fontWeight: '600', fontSize: 14, fontFamily: fonts.sans },
  message: { borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 20, fontFamily: fonts.sans },
  error: { backgroundColor: '#FDECEA', color: colors.danger },
  notice: { backgroundColor: '#E8F5EC', color: '#256D46' },
  submit: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 17, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: fonts.sans },
  switch: { textAlign: 'center', color: colors.muted, fontSize: 15, fontFamily: fonts.sans },
  switchLink: { color: colors.primary, fontWeight: '700' },
});
