import type { AlertButton } from 'react-native';

export { Alert } from 'react-native';

export type AlertRequest = { title: string; message?: string; buttons?: AlertButton[] };

/** Solo hace algo en web; en el teléfono se usan las alertas del sistema. */
export function setAlertHandler(_handler: ((request: AlertRequest) => void) | null) {}
