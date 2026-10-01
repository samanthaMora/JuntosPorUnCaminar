import type { AlertButton } from 'react-native';

export type AlertRequest = { title: string; message?: string; buttons?: AlertButton[] };

let show: ((request: AlertRequest) => void) | null = null;

/** Lo usa <AlertHost /> para mostrar los avisos con el diseño de la app. */
export function setAlertHandler(handler: typeof show) {
  show = handler;
}

/** En web, Alert de react-native no hace nada: se usa una ventana propia. */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (show) return show({ title, message, buttons });
    // Por si se llama antes de que la ventana esté lista.
    const text = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
    } else if (window.confirm(text)) buttons.find((b) => b.style !== 'cancel')?.onPress?.();
  },
};
