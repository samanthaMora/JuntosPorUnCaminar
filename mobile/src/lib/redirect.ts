import type { Href } from 'expo-router';

/** Solo se permite volver a rutas conocidas después de iniciar sesión. */
export function safeNext(next: string | string[] | undefined): Href | null {
  return typeof next === 'string' && /^\/doctor\/[A-Za-z0-9]{4,12}$/.test(next) ? (next as Href) : null;
}
