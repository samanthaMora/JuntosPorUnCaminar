// Elimina la cuenta del usuario que llama (requisito de App Store y Google Play).
// No se permite mientras tenga citas próximas: primero debe cancelarlas para
// que los pacientes reciban su reembolso.
import { adminClient, corsHeaders, json, userClient } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { data: auth } = await userClient(req).auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: 'No autenticado' }, 401);

  const { count, error: countError } = await adminClient
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
    .in('status', ['confirmed', 'pending_payment'])
    .gt('ends_at', new Date().toISOString());
  if (countError) return json({ error: countError.message }, 500);
  if (count) {
    return json(
      { error: `Tienes ${count} cita(s) próxima(s). Cancélalas antes de eliminar tu cuenta.` },
      409,
    );
  }

  // Borra perfil, citas, horarios y tokens en cascada. Los pagos quedan
  // registrados en Stripe.
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
