// Página a la que Stripe regresa al doctor al terminar (o si expira) el alta.
// Supabase sirve las funciones como texto plano, así que es solo un mensaje.
Deno.serve((req) => {
  const expired = new URL(req.url).searchParams.has('expired');
  const message = expired
    ? 'El enlace expiró. Cierra esta ventana y vuelve a tocar "Configurar cobros" en la app.'
    : 'Listo. Cierra esta ventana para volver a la app Citas.';
  return new Response(message, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
});
