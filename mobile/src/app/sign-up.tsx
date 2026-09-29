import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { Button, Checkbox, Chip, colors, Field, Muted, Screen } from '@/components/ui';
import { safeNext } from '@/lib/redirect';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/types';

export default function SignUp() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [role, setRole] = useState<Role>('patient');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signUp() {
    if (!fullName.trim()) return Alert.alert('Escribe tu nombre');
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) return Alert.alert('Escribe tu teléfono a 10 dígitos');
    if (password.length < 8) return Alert.alert('La contraseña debe tener al menos 8 caracteres');
    if (!accepted) return Alert.alert('Debes aceptar el aviso de privacidad para continuar');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role, full_name: fullName.trim(), phone: phone.replace(/\D/g, ''), privacy_accepted: 'true' },
      },
    });
    setBusy(false);
    if (error) return Alert.alert('No se pudo crear la cuenta', error.message);
    if (!data.session) {
      Alert.alert('Revisa tu correo', 'Te enviamos un enlace para confirmar tu cuenta.');
      return router.replace({ pathname: '/sign-in', params: next ? { next } : {} });
    }
    router.replace(safeNext(next) ?? '/');
  }

  return (
    <Screen>
      <Muted>¿Cómo usarás la app?</Muted>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Soy paciente" selected={role === 'patient'} onPress={() => setRole('patient')} />
        <Chip label="Soy doctor" selected={role === 'doctor'} onPress={() => setRole('doctor')} />
      </View>
      <Field
        label={role === 'doctor' ? 'Nombre como aparecerá (ej. Dra. Ana Pérez)' : 'Nombre completo'}
        value={fullName}
        onChangeText={setFullName}
      />
      <Field label="Teléfono (10 dígitos)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Contraseña (mínimo 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
      <Checkbox checked={accepted} onChange={setAccepted}>
        <Text style={{ color: colors.text, lineHeight: 20 }}>
          He leído y acepto el{' '}
          <Link href="/privacy" style={{ color: colors.primary, fontWeight: '600' }}>
            aviso de privacidad
          </Link>
          , incluido el tratamiento de mis datos de salud para agendar y dar seguimiento a mis citas.
        </Text>
      </Checkbox>
      <Button title="Crear cuenta" onPress={signUp} loading={busy} />
    </Screen>
  );
}
