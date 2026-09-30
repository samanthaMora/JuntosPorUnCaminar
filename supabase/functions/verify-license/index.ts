// Verifica la cédula profesional del doctor en la SEP (vía Kiban) y, si el
// nombre coincide y la profesión es del área de la salud, la marca como verificada.
//
// Secretos:
//   KIBAN_API_KEY        clave de Kiban
//   KIBAN_BASE_URL       https://sandbox.link.kiban.com (pruebas) o la URL de producción de Kiban
//   KIBAN_TEST_CASE_ID   solo en sandbox: caso de prueba a simular
import { adminClient, corsHeaders, json, userClient } from '../_shared/clients.ts';

type SepResult = {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  numeroCedula: string;
  profesion: string;
  institution?: string;
};

type KibanResponse = {
  status: string;
  response?: { status: string; results?: SepResult[]; message?: string };
};

// Profesiones que pueden atender pacientes en la app.
const HEALTH =
  /(MEDIC|CIRUJAN|ODONTOLOG|DENTIST|ESTOMATOLOG|PSICOLOG|NUTRI|ENFERMER|FISIOTERAP|TERAPIA FISICA|REHABILITA|OPTOMETR|QUIROPRACT|PODOLOG|PEDIATR|GINECOLOG|OBSTETRI|CARDIOLOG|DERMATOLOG|PSIQUIATR|OFTALMOLOG|ORTOPED|TRAUMATOLOG|OTORRINO|NEUROLOG|ANESTESIOLOG|RADIOLOG|UROLOG|ENDOCRINOLOG|GASTROENTEROLOG|ONCOLOG|NEFROLOG|NEUMOLOG|GERIATR|SALUD)/;
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

  const apiKey = Deno.env.get('KIBAN_API_KEY');
  if (!apiKey) return json({ status: 'error', message: 'La verificación automática aún no está configurada.' });

  const base = Deno.env.get('KIBAN_BASE_URL') ?? 'https://sandbox.link.kiban.com';
  const testCase = Deno.env.get('KIBAN_TEST_CASE_ID');
  const url = `${base}/api/v2/sep_cedula/validate_by_id${testCase ? `?testCaseId=${testCase}` : ''}`;

  let result: KibanResponse;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCedula: doctor.license_number }),
    });
    result = await res.json();
  } catch (e) {
    console.error(e);
    return json({ status: 'error', message: 'No pudimos consultar la SEP. Intenta de nuevo en unos minutos.' });
  }

  if (result.response?.status === 'UNAVAILABLE' || result.status !== 'SUCCESS') {
    console.error(result);
    return json({ status: 'error', message: 'El registro de la SEP no está disponible. Intenta de nuevo en unos minutos.' });
  }

  const number = doctor.license_number.replace(/^0+/, '');
  const match = (result.response?.results ?? []).find((r) => r.numeroCedula.replace(/^0+/, '') === number);
  if (!match) {
    return json({ status: 'rejected', message: 'No encontramos esa cédula en el Registro Nacional de Profesionistas.' });
  }

  const fullName = (doctor.profiles as unknown as { full_name: string }).full_name;
  if (!nameMatches(fullName, match)) {
    return json({
      status: 'rejected',
      message: `La cédula está registrada a nombre de ${match.nombre}. Tu nombre en la app debe coincidir con el de la SEP.`,
    });
  }

  const profession = words(match.profesion).join(' ');
  if (!HEALTH.test(profession) || NOT_HUMAN_HEALTH.test(profession)) {
    return json({
      status: 'rejected',
      message: `La cédula corresponde a "${match.profesion}", que no es una profesión del área de la salud.`,
    });
  }

  const { error } = await adminClient
    .from('doctors')
    .update({ license_verified_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('license_number', doctor.license_number);
  if (error) {
    console.error(error);
    return json({ status: 'error', message: 'No se pudo guardar la verificación.' }, 500);
  }
  return json({ status: 'verified', profession: match.profesion });
});
