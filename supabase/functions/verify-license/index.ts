// Verifica la cédula profesional del doctor en la SEP y, si el nombre coincide
// y la profesión es del área de la salud, la marca como verificada.
//
// Usa el primer servicio que tenga clave configurada:
//   IDOO_API_KEY         idoo.dev (registro inmediato, plan gratis de 100 consultas/mes)
//   KIBAN_API_KEY        Kiban; además KIBAN_BASE_URL (producción) o KIBAN_TEST_CASE_ID (sandbox)
import { adminClient, corsHeaders, json, userClient } from '../_shared/clients.ts';

type SepResult = {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  numeroCedula: string;
  profesion: string;
  institution?: string;
};

type Lookup = { kind: 'ok'; results: SepResult[] } | { kind: 'unconfigured' } | { kind: 'unavailable' };

// La documentación de idoo.dev muestra `data.items` con paterno/materno/titulo,
// pero la API real responde `data` como lista con primerApellido/segundoApellido/profesion.
type IdooItem = {
  cedula?: string;
  idProfesionista?: string;
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  paterno?: string;
  materno?: string;
  profesion?: string | null;
  carrera?: string | null;
  titulo?: string;
};

type IdooResponse = {
  valid: boolean;
  status: number;
  data: IdooItem[] | { items: IdooItem[] } | null;
};

type KibanResponse = {
  status: string;
  response?: { status: string; results?: SepResult[]; message?: string };
};

// Profesiones que pueden atender pacientes en la app.
const HEALTH =
  /(MEDIC|CIRUJAN|ODONTOLOG|DENTIST|ESTOMATOLOG|PSICOLOG|NUTRI|ENFERMER|FISIOTERAP|TERAPIA FISICA|REHABILITA|OPTOMETR|QUIROPRACT|PODOLOG|PEDIATR|GINECOLOG|OBSTETRI|CARDIOLOG|DERMATOLOG|PSIQUIATR|OFTALMOLOG|ORTOPED|TRAUMATOLOG|OTORRINO|NEUROLOG|ANESTESIOLOG|RADIOLOG|RADIODIAGNOST|IMAGENOLOG|UROLOG|ENDOCRINOLOG|GASTROENTEROLOG|ONCOLOG|NEFROLOG|NEUMOLOG|GERIATR|SALUD)/;
const NOT_HUMAN_HEALTH = /VETERINAR|ZOOTECN/;
const TITLES = new Set(['DR', 'DRA', 'DOCTOR', 'DOCTORA', 'LIC', 'MTRO', 'MTRA', 'PSIC', 'LN', 'LNC', 'QFB']);

/** Mayúsculas, sin acentos, sin puntuación ni títulos. */
function words(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !TITLES.has(w));
}

const DAILY_LIMIT = 5;

type Rejection = 'not_found' | 'name_mismatch' | 'not_health';

const REJECTIONS: Record<Rejection, string> = {
  not_found: 'No encontramos esa cédula en el Registro Nacional de Profesionistas. Revisa el número.',
  name_mismatch:
    'El nombre de tu cuenta no coincide con el del titular de esta cédula. Escribe tu nombre tal como aparece en tu cédula y guarda de nuevo.',
  not_health: 'Esta cédula no corresponde a una profesión del área de la salud.',
};

/** Busca la cédula en el servicio configurado y devuelve los registros de la SEP. */
async function lookupLicense(number: string): Promise<Lookup> {
  const idooKey = Deno.env.get('IDOO_API_KEY');
  if (idooKey) {
    const res = await fetch('https://api.idoo.dev/v1/consultar-cedula-profesional/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idooKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula: number }),
    });
    const body: IdooResponse = await res.json();
    if (res.status === 404 || (body.valid === false && body.status === 404)) return { kind: 'ok', results: [] };
    if (!res.ok || !body.valid) {
      console.error(res.status, body);
      return { kind: 'unavailable' };
    }
    const items = Array.isArray(body.data) ? body.data : (body.data?.items ?? []);
    return {
      kind: 'ok',
      results: items.map((i) => {
        const first = i.primerApellido ?? i.paterno ?? '';
        const second = i.segundoApellido ?? i.materno ?? '';
        return {
          nombre: [i.nombre, first, second].filter(Boolean).join(' '),
          primerApellido: first,
          segundoApellido: second,
          numeroCedula: i.cedula ?? i.idProfesionista ?? '',
          profesion: i.profesion ?? i.carrera ?? i.titulo ?? '',
        };
      }),
    };
  }

  const kibanKey = Deno.env.get('KIBAN_API_KEY');
  if (kibanKey) {
    const base = Deno.env.get('KIBAN_BASE_URL') ?? 'https://sandbox.link.kiban.com';
    const testCase = Deno.env.get('KIBAN_TEST_CASE_ID');
    const res = await fetch(`${base}/api/v2/sep_cedula/validate_by_id${testCase ? `?testCaseId=${testCase}` : ''}`, {
      method: 'POST',
      headers: { 'x-api-key': kibanKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCedula: number }),
    });
    const body: KibanResponse = await res.json();
    if (body.response?.status === 'NOT_FOUND') return { kind: 'ok', results: [] };
    if (body.status !== 'SUCCESS' || body.response?.status !== 'FOUND') {
      console.error(body);
      return { kind: 'unavailable' };
    }
    return { kind: 'ok', results: body.response.results ?? [] };
  }

  return { kind: 'unconfigured' };
}

/** El primer apellido y al menos un nombre de la SEP deben aparecer en el nombre del doctor. */
function nameMatches(appName: string, sep: SepResult) {
  const mine = new Set(words(appName));
  const surname = words(sep.primerApellido ?? '');
  const surnames = new Set([...surname, ...words(sep.segundoApellido ?? '')]);
  const givenNames = words(sep.nombre).filter((w) => !surnames.has(w) && w.length > 2);
  if (surname.length === 0 || givenNames.length === 0) return false;
  return surname.every((w) => mine.has(w)) && givenNames.some((w) => mine.has(w));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { data: auth } = await userClient(req).auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: 'No autenticado' }, 401);

  const { data: doctor } = await adminClient
    .from('doctors')
    .select('license_number, license_verified_at, profiles(full_name)')
    .eq('id', user.id)
    .maybeSingle();
  if (!doctor) return json({ error: 'Solo los doctores tienen cédula' }, 403);
  if (doctor.license_verified_at) return json({ status: 'verified' });
  if (!doctor.license_number) return json({ status: 'missing', message: 'Escribe tu número de cédula.' });

  const fullName = (doctor.profiles as unknown as { full_name: string }).full_name;

  // Si esta misma cédula con este mismo nombre ya se rechazó, no se vuelve a pagar la consulta.
  const { data: previous } = await adminClient
    .from('license_checks')
    .select('result')
    .eq('doctor_id', user.id)
    .eq('license_number', doctor.license_number)
    .eq('full_name', fullName)
    .neq('result', 'verified')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previous) return json({ status: 'rejected', message: REJECTIONS[previous.result as Rejection] });

  // Límite diario: protege el saldo y evita que alguien adivine el nombre del titular.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from('license_checks')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({
      status: 'error',
      message: 'Alcanzaste el límite de verificaciones por hoy. Revisa tus datos e intenta de nuevo mañana.',
    });
  }

  let lookup: Lookup;
  try {
    lookup = await lookupLicense(doctor.license_number);
  } catch (e) {
    console.error(e);
    return json({ status: 'error', message: 'No pudimos consultar la SEP. Intenta de nuevo en unos minutos.' });
  }
  if (lookup.kind === 'unconfigured') {
    return json({ status: 'error', message: 'La verificación automática aún no está configurada.' });
  }
  if (lookup.kind === 'unavailable') {
    return json({ status: 'error', message: 'El registro de la SEP no está disponible. Intenta de nuevo en unos minutos.' });
  }

  const number = doctor.license_number.replace(/^0+/, '');
  const match = lookup.results.find((r) => r.numeroCedula.replace(/^0+/, '') === number);
  const profession = match ? words(match.profesion).join(' ') : '';
  const result: Rejection | 'verified' = !match
    ? 'not_found'
    : !nameMatches(fullName, match)
      ? 'name_mismatch'
      : !HEALTH.test(profession) || NOT_HUMAN_HEALTH.test(profession)
        ? 'not_health'
        : 'verified';

  await adminClient
    .from('license_checks')
    .insert({ doctor_id: user.id, license_number: doctor.license_number, full_name: fullName, result });
  // Nunca se devuelven los datos del titular: solo si pasó o por qué no.
  if (result !== 'verified') return json({ status: 'rejected', message: REJECTIONS[result] });

  const { error } = await adminClient
    .from('doctors')
    .update({ license_verified_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('license_number', doctor.license_number);
  if (error) {
    console.error(error);
    return json({ status: 'error', message: 'No se pudo guardar la verificación.' }, 500);
  }
  return json({ status: 'verified' });
});
