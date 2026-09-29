import { useState } from 'react';
import { Text } from 'react-native';

import { Alert } from '@/lib/alert';
import { AccountActions } from '@/components/AccountActions';
import { Button, Card, Field, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!fullName.trim()) return Alert.alert('Escribe tu nombre');
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) return Alert.alert('Escribe tu teléfono a 10 dígitos');
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.replace(/\D/g, '') })
      .eq('id', session!.user.id);
    setBusy(false);
    if (error) return Alert.alert('No se pudo guardar', error.message);
    await refreshProfile();
    Alert.alert('Guardado');
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Mis datos</Text>
        <Muted>{session?.user.email}</Muted>
        <Field label="Nombre completo" value={fullName} onChangeText={setFullName} />
        <Field label="Teléfono (10 dígitos)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Muted>Tu doctor verá tu nombre y teléfono para contactarte sobre tu cita.</Muted>
        <Button title="Guardar" onPress={save} loading={busy} />
      </Card>
      <AccountActions />
    </Screen>
  );
}
