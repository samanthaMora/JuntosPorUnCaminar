import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Alert } from '@/lib/alert';
import { Button, Field, Muted, Screen, Title } from '@/components/ui';
import { safeNext } from '@/lib/redirect';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return Alert.alert('No se pudo iniciar sesión', error.message);
    router.replace(safeNext(next) ?? '/');
  }

  return (
    <Screen>
      <Title>Bienvenido</Title>
      <Muted>Agenda y paga tu consulta en segundos.</Muted>
      <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Entrar" onPress={signIn} loading={busy} />
      <Link href={{ pathname: '/sign-up', params: next ? { next } : {} }} style={{ textAlign: 'center', padding: 8 }}>
        <Muted>¿No tienes cuenta? Regístrate</Muted>
      </Link>
      <Link href="/forgot-password" style={{ textAlign: 'center', padding: 8 }}>
        <Muted>Olvidé mi contraseña</Muted>
      </Link>
    </Screen>
  );
}
