import { Text } from 'react-native';

import { Muted, Screen, Title } from '@/components/ui';

// PLANTILLA: reemplaza los datos entre corchetes y haz que un abogado revise
// este texto antes de publicar la app.
const SECTIONS: [string, string][] = [
  [
    'Responsable',
    '[Razón social], con domicilio en [domicilio], es responsable del tratamiento de tus datos personales. Contacto: [correo de privacidad].',
  ],
  [
    'Datos que recabamos',
    'Nombre, correo electrónico, teléfono y, en el caso de doctores, cédula profesional y datos del consultorio. Por la naturaleza del servicio, el registro de tus citas con profesionales de la salud se considera un dato personal sensible.',
  ],
  [
    'Finalidades',
    'Crear y administrar tu cuenta; agendar, cambiar y cancelar citas; procesar pagos y reembolsos; enviarte confirmaciones y recordatorios; y cumplir obligaciones legales y fiscales.',
  ],
  [
    'Transferencias',
    'Compartimos los datos necesarios con el doctor con quien agendas, con Stripe para procesar pagos y con nuestros proveedores de infraestructura (Supabase y Expo), quienes están obligados a protegerlos. No vendemos tus datos.',
  ],
  [
    'Pagos',
    'Los datos de tu tarjeta los recibe y protege directamente Stripe; nosotros no los almacenamos.',
  ],
  [
    'Derechos ARCO',
    'Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, así como revocar tu consentimiento, escribiendo a [correo de privacidad]. También puedes eliminar tu cuenta desde la app.',
  ],
  ['Cambios', 'Publicaremos cualquier cambio a este aviso en la app. Última actualización: [fecha].'],
];

export default function Privacy() {
  return (
    <Screen>
      <Title>Aviso de privacidad</Title>
      {SECTIONS.map(([heading, body]) => (
        <Text key={heading} style={{ gap: 4 }}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{heading}</Text>
          {'\n'}
          <Muted>{body}</Muted>
        </Text>
      ))}
    </Screen>
  );
}
