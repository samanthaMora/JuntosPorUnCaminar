import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { AlertHost } from '@/components/AlertHost';
import { PushManager } from '@/components/PushManager';
import { colors } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';
import { PaymentsProvider } from '@/lib/payments';
import { loadWebFonts } from '@/lib/webFonts';

export default function RootLayout() {
  useEffect(loadWebFonts, []);

  return (
    <PaymentsProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <PushManager />
        <Stack screenOptions={{ headerTintColor: colors.primary, headerBackTitle: 'Atrás' }}>
          <Stack.Screen name="index" options={{ headerShown: false, title: 'goodates' }} />
          <Stack.Screen name="(patient)" options={{ headerShown: false }} />
          <Stack.Screen name="(practice)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false, title: 'Iniciar sesión' }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false, title: 'Crear cuenta' }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Recuperar contraseña' }} />
          <Stack.Screen name="privacy" options={{ title: 'Aviso de privacidad' }} />
          <Stack.Screen name="doctor/[code]" options={{ title: 'Agendar cita' }} />
          <Stack.Screen name="reschedule/[id]" options={{ title: 'Cambiar cita' }} />
        </Stack>
        <AlertHost />
      </AuthProvider>
    </PaymentsProvider>
  );
}
