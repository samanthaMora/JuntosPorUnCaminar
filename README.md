# Citas — agenda médica con pago por adelantado

App móvil (iOS/Android) donde los **doctores** publican su agenda y los **pacientes** los encuentran, eligen un horario y **pagan la consulta para confirmar la cita**. Cada doctor configura cuántas horas antes de la cita el paciente ya no puede cambiarla ni cancelarla.

Los pagos usan **Stripe Connect**: el dinero de cada consulta llega directo a la cuenta bancaria del doctor y la plataforma se queda con una comisión.

| Carpeta | Qué contiene |
| --- | --- |
| `mobile/` | App en Expo (React Native + Expo Router) |
| `supabase/migrations/` | Base de datos, reglas de negocio y seguridad (RLS) |
| `supabase/functions/` | Funciones del servidor para Stripe |

## Cómo funciona

**Paciente**
1. Busca al doctor por nombre, especialidad, ciudad o por su **código** (ej. `DRAPEREZ`), o abre el enlace que el doctor comparte (`citas://doctor/DRAPEREZ`).
2. Ve los días y horas libres de las próximas 3 semanas y elige uno.
3. El horario queda **apartado 15 minutos** mientras paga con tarjeta (Stripe).
4. Cuando Stripe confirma el pago, la cita queda **confirmada**. Si cierra el pago, el horario se libera.
5. En "Mis citas" puede **cambiar** la cita a otro horario o **cancelarla con reembolso**, solo hasta el límite que puso el doctor.
6. Recibe un **recordatorio** 24 h antes y un aviso si el doctor cancela.
7. En "Mi perfil" edita su nombre y teléfono, lee el aviso de privacidad o **elimina su cuenta**.

**Doctor**
- **Mi agenda:** citas próximas por día, su código para compartir y la opción de cancelar (siempre reembolsa). Recibe un aviso cuando le agendan, reprograman o cancelan.
- **Horarios:** bloques de atención por día de la semana (ej. lun–vie 09:00–14:00 y 16:00–19:00) y **días libres/vacaciones**.
- **Configuración:** perfil, precio, duración de cada cita, **horas límite para cambios** y si aparece en búsquedas.
- **Cédula profesional:** la registra en Configuración y la plataforma la verifica (ver abajo).
- **Cobros:** el doctor da de alta su cuenta en Stripe (identificación, RFC y CLABE) desde la app. Desde ahí también abre su panel de Stripe para ver pagos y depósitos.

Un doctor solo aparece en búsquedas y acepta citas cuando **las tres** cosas están listas: "Aparecer en búsquedas" encendido, cédula verificada y cobros configurados.

**Cuentas**
- Registro con teléfono y **aceptación del aviso de privacidad** (la base de datos rechaza registros sin consentimiento).
- Recuperación de contraseña con código por correo.
- Si alguien abre el enlace de un doctor sin sesión, al entrar o registrarse vuelve a ese doctor.
- Eliminar cuenta desde la app (requisito de App Store y Google Play). No se permite con citas próximas: primero hay que cancelarlas para que se reembolse a los pacientes.

**Dinero**
- Cada pago es un *cargo a un destino*: el paciente paga a la plataforma, Stripe transfiere la consulta al doctor y descuenta la comisión de la plataforma (`platform_settings.fee_percent`, 10 % por defecto).
- La plataforma paga las comisiones de Stripe con su parte. Ejemplo: consulta de $850 con 10 % → el doctor recibe $765 y la plataforma $85, menos la comisión de Stripe.
- En un reembolso (cancelación a tiempo, cancelación del doctor o pago tardío sin horario) el paciente recibe el 100 %: se le retira el monto al doctor y la plataforma devuelve su comisión. Stripe **no** devuelve su comisión de procesamiento, así que ese costo lo absorbe la plataforma.

Las reglas importantes viven en la base de datos, no solo en la app: nunca se pueden agendar dos citas encimadas, el límite para cambios no se puede saltar desde el cliente y solo el webhook de Stripe puede confirmar un pago.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) e instala la CLI (`brew install supabase/tap/supabase`).
2. Desde esta carpeta:
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```
3. Para probar rápido, en *Authentication → Providers → Email* puedes desactivar "Confirm email".
4. En *Authentication → Email Templates → Reset Password*, incluye el código en el correo, por ejemplo:
   ```html
   <h2>Recupera tu contraseña</h2>
   <p>Tu código es: <strong>{{ .Token }}</strong></p>
   ```

### 2. Stripe
1. Crea una cuenta en [stripe.com](https://stripe.com) (en modo prueba) y copia tus llaves en *Developers → API keys*.
2. Activa **Connect** en el Dashboard de Stripe, completa el [perfil de la plataforma](https://dashboard.stripe.com/connect/registration) y en *Connect → Settings* pon el nombre, color e ícono que verán los doctores en el alta.
3. Configura el secreto y despliega las funciones:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase functions deploy create-booking
   supabase functions deploy cancel-appointment
   supabase functions deploy connect-account
   supabase functions deploy delete-account
   supabase functions deploy connect-return --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy confirm-booking
   ```
4. En Stripe, *Developers → Webhooks*, crea **dos** endpoints con la misma URL `https://TU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`:
   - *Your account*, evento `payment_intent.succeeded`
   - *Connected accounts*, evento `account.updated`
5. Guarda el *Signing secret* de cada uno:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...          # el de "Your account"
   supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...  # el de "Connected accounts"
   ```
6. Para cambiar la comisión de la plataforma (ej. a 8 %), en el *SQL Editor* de Supabase:
   ```sql
   update platform_settings set fee_percent = 8;
   ```
   Solo aplica a citas nuevas.

### 3. Notificaciones push
1. Vincula la app con Expo (crea el `projectId` que necesitan los avisos y lo guarda en `mobile/app.json`):
   ```bash
   cd mobile && npx eas-cli@latest init
   ```
2. Crea un secreto para el envío programado y despliega la función:
   ```bash
   supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
   supabase functions deploy send-notifications --no-verify-jwt
   ```
3. En el *SQL Editor* de Supabase, guarda el mismo secreto en Vault y programa el envío cada minuto (también manda los recordatorios de 24 h):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select vault.create_secret('EL_MISMO_CRON_SECRET', 'cron_secret');

   select cron.schedule('send-notifications', '* * * * *', $$
     select net.http_post(
       url := 'https://TU_PROJECT_REF.supabase.co/functions/v1/send-notifications',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
       ),
       body := '{}'::jsonb
     );
   $$);
   ```

En **iOS** los avisos funcionan en Expo Go. En **Android**, Expo Go ya no soporta push: hace falta un *development build* (`npx eas-cli@latest build --profile development --platform android`). Sin push la app funciona igual; solo no llegan los avisos.

### 4. Verificar doctores (automático)
Al guardar su cédula, la función `verify-license` la consulta en el Registro Nacional de Profesionistas de la SEP. Se aprueba sola si:
- la cédula existe,
- el primer apellido y al menos un nombre de la SEP aparecen en el nombre del doctor en la app, y
- la profesión es del área de la salud (medicina, odontología, psicología, nutrición, etc.).

Si no se cumple, el doctor ve el motivo en *Ajustes*. Si cambia su cédula o su nombre, se vuelve a verificar.

La consulta se hace con el primer servicio que tenga clave:
- **[idoo.dev](https://www.idoo.dev/apis/consultar-cedula-profesional)** (registro inmediato, 100 consultas gratis al mes):
  ```bash
  supabase secrets set IDOO_API_KEY=...
  ```
- **[Kiban](https://docs.kiban.com/reference/validate-by-number)**:
  ```bash
  supabase secrets set KIBAN_API_KEY=...
  supabase secrets set KIBAN_BASE_URL=...               # URL de producción que te dé Kiban
  supabase secrets set KIBAN_TEST_CASE_ID=681bb9c0d4e2f1a038b7c5e1   # solo en sandbox
  ```

Para aprobar a alguien a mano (por ejemplo, si la SEP no responde), en el *SQL Editor*:
```sql
update doctors set license_verified_at = now() where public_code = 'CODIGO';
```

### 5. App
```bash
cd mobile
cp .env.example .env.local   # llena la URL y anon key de Supabase y la llave pública de Stripe
npm install
npx expo start
```
Escanea el QR con **Expo Go** en tu celular. Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura y CVC.

Prueba sugerida:
1. Crea una cuenta de doctor, configura horarios, precio y cédula, y activa "Aparecer en búsquedas".
2. En *Configuración → Cobros*, toca "Configurar cobros". En modo prueba, Stripe ofrece llenar el alta con datos de prueba.
3. Aprueba la cédula con el SQL de la sección 4.
4. Con otra cuenta de paciente, busca al doctor por su código, agenda y paga.
5. En el Dashboard de Stripe verás el pago, la transferencia a la cuenta conectada y tu comisión.

### 6. Versión web
Para probarla en tu computadora: `npx expo start --web` dentro de `mobile/` y abre http://localhost:8081.

Para publicarla en internet con [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/) (necesitas una cuenta gratis en expo.dev y el `.env.local` lleno):
```bash
cd mobile
npm run deploy:web
```
La primera vez pide iniciar sesión y elegir un nombre; al final muestra la dirección (`https://NOMBRE.expo.app`). Agrega esa dirección en Supabase, en *Authentication → URL Configuration*, para que funcione el inicio de sesión.

En web el pago se hace con el formulario de Stripe y no hay notificaciones push (esas solo llegan a la app del teléfono).

## Pendiente antes de producción

- **Facturación (CFDI):** Stripe no emite facturas del SAT. Los doctores facturan sus consultas y la plataforma debe facturar su comisión; se puede integrar un PAC (ej. Facturapi).
- **Riesgo:** con esta configuración la plataforma responde por contracargos y saldos negativos de los doctores. Revisa la [guía de riesgos de Connect](https://docs.stripe.com/connect/risk-management/best-practices).
- **Aviso de privacidad:** [mobile/src/app/privacy.tsx](mobile/src/app/privacy.tsx) es una **plantilla**. Llena los datos entre corchetes y haz que un abogado la revise.
- **Panel de administración:** la verificación de cédulas se hace por SQL. Con muchos doctores conviene una pantalla de administración.
- **Eliminar cuenta de doctor:** su cuenta conectada de Stripe no se borra; desactívala desde el Dashboard de Stripe si hace falta.
- **Apple Pay / Google Pay:** requieren un *development build* (`eas build`) y configurar `merchantIdentifier` en `mobile/app.json`.
