import { router } from 'expo-router';
import { useState } from 'react';

import { Alert } from '@/lib/alert';
import { signOut } from '@/lib/auth';
import { invokeFunction } from '@/lib/supabase';

import { Button, Card } from './ui';

/** Aviso de privacidad, cerrar sesión y eliminar cuenta. */
export function AccountActions() {
  const [busy, setBusy] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Eliminar mi cuenta',
      'Se borrarán tu perfil y tu historial de citas. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await invokeFunction('delete-account', {});
              await signOut();
              Alert.alert('Cuenta eliminada');
            } catch (e) {
              Alert.alert('No se pudo eliminar la cuenta', (e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Card>
      <Button title="Aviso de privacidad" variant="secondary" onPress={() => router.push('/privacy')} />
      <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
      <Button title="Eliminar mi cuenta" variant="danger" onPress={confirmDelete} loading={busy} />
    </Card>
  );
}
