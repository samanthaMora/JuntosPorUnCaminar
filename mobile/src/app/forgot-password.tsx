import { router } from 'expo-router';
import { useState } from 'react';


import { Alert } from '@/lib/alert';
import { Button, Field, Muted, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Recuperación con código de 6 dígitos (la plantilla "Reset Password" de
// Supabase debe incluir {{ .Token }}; ver README).
export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) return Alert.alert('No se pudo enviar el código', error.message);
    setStep('code');
  }

  async function reset() {
    if (password.length < 8) return Alert.alert('La contraseña debe tener al menos 8 caracteres');
    setBusy(true);
    const { error: otpError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (otpError) {
      setBusy(false);
      return Alert.alert('Código inválido o vencido', otpError.message);
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return Alert.alert('No se pudo cambiar la contraseña', error.message);
    Alert.alert('Contraseña actualizada');
    router.replace('/');
  }

  if (step === 'email') {
    return (
      <Screen>
        <Muted>Te enviaremos un código a tu correo para crear una contraseña nueva.</Muted>
        <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button title="Enviar código" onPress={sendCode} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>Escribe el código que enviamos a {email.trim()}.</Muted>
      <Field label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
      <Field label="Contraseña nueva" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Cambiar contraseña" onPress={reset} loading={busy} />
      <Button title="Reenviar código" variant="secondary" onPress={sendCode} disabled={busy} />
    </Screen>
  );
}
