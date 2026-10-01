import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';

import { AuthShell, ShellButton, ShellField, ShellMessage, shellStyles } from '@/components/AuthShell';
import { Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Lee los datos que Supabase pone después del "#" en el enlace del correo. */
function readLinkParams(url: string | null) {
  const hash = url?.split('#')[1] ?? '';
  return Object.fromEntries(new URLSearchParams(hash));
}

// En web se lee el enlace al abrir la página, antes de que la navegación lo cambie.
const webLink = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : null;

// Pantalla a la que lleva el enlace del correo de recuperación.
export default function ResetPassword() {
  const nativeUrl = Linking.useURL();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>(() =>
    readLinkParams(webLink).error ? 'invalid' : 'checking',
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = Platform.OS === 'web' ? webLink : nativeUrl;
    if (Platform.OS !== 'web' && !url) return;
    const params = readLinkParams(url);
    // No dejar las llaves de acceso visibles en la barra de direcciones.
    if (Platform.OS === 'web' && window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    if (params.error) return;

    if (params.access_token && params.refresh_token) {
      supabase.auth
        .setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
        .then(({ error: sessionError }) => setState(sessionError ? 'invalid' : 'ready'));
    } else {
      // Sin datos en el enlace: sirve si ya hay sesión (por ejemplo, al recargar la página).
      supabase.auth.getSession().then(({ data }) => setState(data.session ? 'ready' : 'invalid'));
    }
  }, [nativeUrl]);

  async function save() {
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      return setError(
        /different|same/i.test(updateError.message)
          ? 'La contraseña nueva debe ser distinta a la anterior.'
          : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      );
    }
    setState('done');
  }

  if (state === 'checking') return <Loading />;

  if (state === 'invalid') {
    return (
      <AuthShell title="El enlace ya no sirve" subtitle="Puede que haya vencido o que ya lo hayas usado.">
        <ShellButton title="Pedir un enlace nuevo" onPress={() => router.replace('/forgot-password')} />
      </AuthShell>
    );
  }

  if (state === 'done') {
    return (
      <AuthShell title="¡Listo!" subtitle="Tu contraseña se cambió correctamente." back={{ label: 'Inicio', href: '/' }}>
        <ShellMessage tone="success">Ya puedes usar tu contraseña nueva la próxima vez que inicies sesión.</ShellMessage>
        <ShellButton title="Continuar" onPress={() => router.replace('/')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea tu contraseña nueva" subtitle="Elige una que no hayas usado antes.">
      <ShellField
        label="Contraseña nueva"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!show}
        autoComplete="new-password"
        right={
          <Pressable onPress={() => setShow(!show)} hitSlop={8}>
            <Text style={shellStyles.show}>{show ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        }
      />
      <ShellField
        label="Confirma tu contraseña"
        placeholder="Escríbela otra vez"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!show}
        autoComplete="new-password"
        onSubmitEditing={save}
      />
      {!!error && <ShellMessage tone="error">{error}</ShellMessage>}
      <ShellButton title="Guardar contraseña" onPress={save} busy={busy} />
    </AuthShell>
  );
}
