import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionRow, Avatar, PageHeader, text } from '@/components/patient';
import { Button, colors, Field, MAX_WIDTH } from '@/components/ui';
import { Alert } from '@/lib/alert';
import { signOut, useAuth } from '@/lib/auth';
import { invokeFunction, supabase } from '@/lib/supabase';

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

  function confirmDelete() {
    Alert.alert('Eliminar mi cuenta', 'Se borrarán tu perfil y tu historial de citas. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await invokeFunction('delete-account', {});
            await signOut();
            Alert.alert('Cuenta eliminada');
          } catch (e) {
            Alert.alert('No se pudo eliminar la cuenta', (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <PageHeader eyebrow="Mi perfil" title="Tu cuenta" />
      <View style={styles.body}>
        <View style={[styles.card, styles.identity]}>
          <Avatar name={profile?.full_name ?? '?'} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={text.h2}>{profile?.full_name}</Text>
            <Text style={text.muted}>{session?.user.email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={text.h3}>Mis datos</Text>
          <Field label="Nombre completo" value={fullName} onChangeText={setFullName} />
          <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10 dígitos" />
          <Text style={[text.muted, { fontSize: 13 }]}>Tu doctor verá tu nombre y teléfono para contactarte sobre tu cita.</Text>
          <Button title="Guardar cambios" onPress={save} loading={busy} />
        </View>

        <View style={[styles.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
          <ActionRow icon="shield" label="Aviso de privacidad" onPress={() => router.push('/privacy')} />
          <ActionRow icon="log-out" label="Cerrar sesión" onPress={signOut} />
          <ActionRow icon="trash-2" label="Eliminar mi cuenta" onPress={confirmDelete} danger last />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
