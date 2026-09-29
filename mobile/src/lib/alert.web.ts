import type { AlertButton } from 'react-native';

/** En web, Alert de react-native no hace nada: se usan los diálogos del navegador. */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const text = message ? `${title}\n\n${message}` : title;
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(text)) actions[0]?.onPress?.();
    else buttons.find((b) => b.style === 'cancel')?.onPress?.();
  },
};
