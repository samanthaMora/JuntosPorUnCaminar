import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/push';

/** Registra el teléfono al iniciar sesión y abre la pantalla del aviso tocado. */
export function PushManager() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) registerForPushNotifications();
  }, [userId]);

  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = lastResponse?.notification.request.content.data?.url;
    if (
      userId &&
      typeof url === 'string' &&
      lastResponse?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      router.push(url as Href);
    }
  }, [lastResponse, userId]);

  return null;
}
