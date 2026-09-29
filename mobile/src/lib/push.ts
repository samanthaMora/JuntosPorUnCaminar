import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Mostrar el aviso aunque la app esté abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;

/**
 * Pide permiso y registra el token de este teléfono para el usuario actual.
 * Falla en silencio: sin notificaciones la app sigue funcionando.
 */
export async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'goodates',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return;

    // Se obtiene con `npx eas-cli@latest init` (ver README).
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Notificaciones desactivadas: falta el projectId de EAS en app.json');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (!error) currentToken = token;
  } catch (e) {
    // Ej. Expo Go en Android no soporta push desde SDK 53.
    console.warn('No se pudieron activar las notificaciones', e);
  }
}

/** Deja de enviar avisos de esta cuenta a este teléfono (al cerrar sesión). */
export async function unregisterPushNotifications() {
  if (!currentToken) return;
  await supabase.rpc('unregister_push_token', { p_token: currentToken });
  currentToken = null;
}
