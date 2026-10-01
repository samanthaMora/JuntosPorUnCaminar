import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AuthShell, ShellButton, ShellField, ShellMessage, shellStyles } from '@/components/AuthShell';
import { supabase } from '@/lib/supabase';

/** Dirección a la que lleva el enlace del correo de recuperación. */
function resetUrl() {
  return Platform.OS === 'web' ? `${window.location.origin}/reset-password` : Linking.createURL('/reset-password');
}

// El correo trae un enlace (plantilla por defecto de Supabase) y, si la
// plantilla se personaliza con {{ .Token }}, también un código de 6 dígitos.
export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!email.trim()) return setError('Escribe tu correo.');
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetUrl() });
    setBusy(false);
    if (sendError) {
      return setError(
        /rate|seconds/i.test(sendError.message)
          ? 'Ya te enviamos un correo hace poco. Espera un minuto antes de pedir otro.'
          : 'No pudimos enviar el correo. Revisa la dirección e intenta de nuevo.',
      );
    }
    setStep('sent');
  }

  async function resetWithCode() {
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (otpError) {
      setBusy(false);
      return setError('El código no es válido o ya venció. Pide uno nuevo.');
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
    router.replace('/');
  }

  if (step === 'email') {
    return (
      <AuthShell title="¿Olvidaste tu contraseña?" subtitle="Escribe tu correo y te mandamos un enlace para crear una nueva.">
        <ShellField
          label="Correo"
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          onSubmitEditing={send}
        />
        {!!error && <ShellMessage tone="error">{error}</ShellMessage>}
        <ShellButton title="Enviar enlace" onPress={send} busy={busy} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Revisa tu correo" subtitle={`Enviamos un enlace a ${email.trim()}.`}>
      <ShellMessage tone="info">
        Abre el correo y presiona el enlace para crear tu contraseña nueva. Si no lo ves, revisa tu carpeta de spam.
      </ShellMessage>

      {showCode ? (
        <View style={{ gap: 14 }}>
          <ShellField label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
          <ShellField
            label="Contraseña nueva"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          {!!error && <ShellMessage tone="error">{error}</ShellMessage>}
          <ShellButton title="Cambiar contraseña" onPress={resetWithCode} busy={busy} />
        </View>
      ) : (
        <Pressable onPress={() => setShowCode(true)}>
          <Text style={[shellStyles.muted, { textAlign: 'center' }]}>
            ¿Tu correo trae un código? <Text style={shellStyles.link}>Escríbelo aquí</Text>
          </Text>
        </Pressable>
      )}

      <ShellButton title="Reenviar correo" variant="secondary" onPress={send} busy={busy && !showCode} />
    </AuthShell>
  );
}
