const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

/** Carga las tipografías de Google Fonts una sola vez. */
export function loadWebFonts() {
  if (document.querySelector(`link[href="${FONTS_URL}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONTS_URL;
  document.head.appendChild(link);
}

export const fonts = {
  serif: "'Fraunces', Georgia, serif" as string | undefined,
  sans: "'Plus Jakarta Sans', system-ui, sans-serif" as string | undefined,
};
