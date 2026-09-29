-- Lo necesario para lanzar: aviso de privacidad, cédula profesional verificada,
-- días libres, notificaciones push y eliminación de cuenta.

-- ---------------------------------------------------------------------------
-- Aviso de privacidad y teléfono al registrarse
-- ---------------------------------------------------------------------------

alter table public.profiles add column privacy_accepted_at timestamptz;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := coalesce(v_meta ->> 'role', 'patient')::public.user_role;
  v_name text := coalesce(nullif(trim(v_meta ->> 'full_name'), ''), 'Sin nombre');
  v_code text;
begin
  -- Datos de salud: sin consentimiento expreso no se crea la cuenta (LFPDPPP).
  if coalesce(v_meta ->> 'privacy_accepted', '') <> 'true' then
    raise exception 'Debes aceptar el aviso de privacidad';
  end if;

  insert into public.profiles (id, role, full_name, phone, privacy_accepted_at)
  values (new.id, v_role, v_name, nullif(trim(v_meta ->> 'phone'), ''), now());

  if v_role = 'doctor' then
    -- Código inicial aleatorio; el doctor puede cambiarlo después.
    loop
      v_code := upper(substr(md5(random()::text), 1, 6));
      exit when not exists (select 1 from public.doctors where public_code = v_code);
    end loop;
    insert into public.doctors (id, public_code) values (new.id, v_code);
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Cédula profesional: la plataforma la verifica antes de que el doctor cobre.
-- ---------------------------------------------------------------------------

alter table public.doctors
  add column license_number text not null default '' check (license_number ~ '^([0-9]{7,8})?$'),
  add column license_verified_at timestamptz;

grant update (license_number) on public.doctors to authenticated;

-- Si el doctor cambia su cédula, hay que volver a verificarla.
create or replace function public.reset_license_verification() returns trigger
language plpgsql as $$
begin
  if new.license_number is distinct from old.license_number then
    new.license_verified_at := null;
  end if;
  return new;
end $$;

create trigger doctors_reset_license_verification
  before update on public.doctors
  for each row execute function public.reset_license_verification();

-- Un doctor acepta citas si está publicado, verificado y puede cobrar.
create or replace function public.doctor_is_bookable(p_doctor_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from doctors d
      join doctor_payout_accounts pa on pa.doctor_id = d.id and pa.ready
     where d.id = p_doctor_id
       and d.is_published
       and d.license_verified_at is not null
  );
$$;

create or replace function public.search_doctors(p_query text)
returns table (
  id uuid, full_name text, public_code text, specialty text, city text,
  price_cents integer, currency text, slot_minutes integer
)
language sql stable security definer set search_path = public as $$
  select d.id, p.full_name, d.public_code, d.specialty, d.city,
         d.price_cents, d.currency, d.slot_minutes
    from doctors d
    join profiles p on p.id = d.id
   where doctor_is_bookable(d.id)
     and (
       coalesce(trim(p_query), '') = ''
       or d.public_code = upper(trim(p_query))
       or unaccent(p.full_name || ' ' || d.specialty || ' ' || d.city)
          ilike '%' || unaccent(trim(p_query)) || '%'
     )
   order by (d.public_code = upper(trim(p_query))) desc, p.full_name
   limit 50;
$$;

create or replace function public.create_pending_appointment(p_doctor_id uuid, p_starts_at timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_doc doctors;
  v_fee_percent numeric;
  v_appt appointments;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'patient') then
    raise exception 'Solo los pacientes pueden agendar citas';
  end if;
  if not doctor_is_bookable(p_doctor_id) then
    raise exception 'Este doctor no está disponible para agendar';
  end if;
  select * into v_doc from doctors where id = p_doctor_id;

  perform release_expired_holds();

  -- Un paciente solo aparta un horario a la vez: si abandonó un pago, se libera.
  update appointments
     set status = 'expired'
   where patient_id = auth.uid()
     and status = 'pending_payment';

  if not is_slot_available(p_doctor_id, p_starts_at) then
    raise exception 'Ese horario ya no está disponible';
  end if;

  select fee_percent into v_fee_percent from platform_settings;

  insert into appointments (doctor_id, patient_id, starts_at, ends_at, price_cents, currency,
                            platform_fee_cents, hold_expires_at)
  values (
    p_doctor_id, auth.uid(), p_starts_at,
    p_starts_at + make_interval(mins => v_doc.slot_minutes),
    v_doc.price_cents, v_doc.currency,
    round(v_doc.price_cents * coalesce(v_fee_percent, 0) / 100)::integer,
    now() + make_interval(mins => payment_hold_minutes())
  )
  returning * into v_appt;

  return v_appt;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no está disponible';
end $$;

-- ---------------------------------------------------------------------------
-- Días libres: días completos en la zona horaria del doctor.
-- Devuelve cuántas citas confirmadas quedan dentro, para avisarle.
-- ---------------------------------------------------------------------------

create or replace function public.add_time_off(p_from date, p_to date, p_reason text default '')
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_doc doctors;
  v_starts timestamptz;
  v_ends timestamptz;
  v_conflicts integer;
begin
  select * into v_doc from doctors where id = auth.uid();
  if not found then
    raise exception 'Solo los doctores pueden registrar días libres';
  end if;
  if p_to < p_from then
    raise exception 'La fecha final debe ser igual o posterior a la inicial';
  end if;
  if p_to - p_from > 365 then
    raise exception 'El periodo máximo es de un año';
  end if;

  v_starts := p_from::timestamp at time zone v_doc.timezone;
  v_ends := (p_to + 1)::timestamp at time zone v_doc.timezone;

  insert into time_off (doctor_id, starts_at, ends_at, reason)
  values (v_doc.id, v_starts, v_ends, coalesce(p_reason, ''));

  select count(*) into v_conflicts
    from appointments
   where doctor_id = v_doc.id
     and status = 'confirmed'
     and tstzrange(starts_at, ends_at) && tstzrange(v_starts, v_ends);
  return v_conflicts;
end $$;

-- ---------------------------------------------------------------------------
-- Notificaciones push
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default '',
  updated_at timestamptz not null default now()
);
create index on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
-- Sin políticas: se usa solo por las funciones de abajo y la service role.

-- Un mismo teléfono puede cambiar de cuenta: el token pasa al último usuario.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), coalesce(p_platform, ''))
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

-- Cola de avisos: la llenan los triggers y la vacía la función send-notifications.
create table public.notification_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind text not null check (kind in (
    'new_booking', 'rescheduled', 'cancelled_by_patient', 'cancelled_by_doctor',
    'payment_refunded', 'reminder'
  )),
  created_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz
);
create index on public.notification_queue (id) where sent_at is null;
alter table public.notification_queue enable row level security;

alter table public.appointments add column reminder_sent_at timestamptz;

-- Si la cita cambia de horario, el recordatorio se vuelve a enviar.
create or replace function public.reset_reminder_on_reschedule() returns trigger
language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;

create trigger appointments_reset_reminder
  before update on public.appointments
  for each row execute function public.reset_reminder_on_reschedule();

create or replace function public.enqueue_appointment_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Un pago puede llegar después de que venció el apartado ('expired').
  if old.status in ('pending_payment', 'expired') and new.status = 'confirmed' then
    insert into notification_queue (user_id, appointment_id, kind) values (new.doctor_id, new.id, 'new_booking');
  elsif old.status in ('pending_payment', 'expired') and new.status = 'cancelled' then
    -- Pagó tarde y el horario ya estaba ocupado: se le reembolsó.
    insert into notification_queue (user_id, appointment_id, kind) values (new.patient_id, new.id, 'payment_refunded');
  elsif old.status = 'confirmed' and new.status = 'cancelled' then
    if new.cancelled_by = new.patient_id then
      insert into notification_queue (user_id, appointment_id, kind) values (new.doctor_id, new.id, 'cancelled_by_patient');
    elsif new.cancelled_by = new.doctor_id then
      insert into notification_queue (user_id, appointment_id, kind) values (new.patient_id, new.id, 'cancelled_by_doctor');
    end if;
  elsif new.status = 'confirmed' and new.starts_at is distinct from old.starts_at then
    insert into notification_queue (user_id, appointment_id, kind) values (new.doctor_id, new.id, 'rescheduled');
  end if;
  return new;
end $$;

create trigger appointments_enqueue_notifications
  after update on public.appointments
  for each row execute function public.enqueue_appointment_notifications();

-- Recordatorio al paciente 24 h antes (salvo que haya agendado con menos
-- anticipación: acaba de recibir la confirmación).
create or replace function public.enqueue_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with due as (
    update appointments
       set reminder_sent_at = now()
     where status = 'confirmed'
       and reminder_sent_at is null
       and starts_at > now()
       and starts_at <= now() + interval '24 hours'
       and paid_at < starts_at - interval '24 hours'
    returning id, patient_id
  )
  insert into notification_queue (user_id, appointment_id, kind)
  select patient_id, id, 'reminder' from due;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Toma un lote de avisos pendientes sin chocar con otra ejecución simultánea.
create or replace function public.claim_notifications(p_limit integer default 100)
returns setof public.notification_queue
language sql security definer set search_path = public as $$
  update notification_queue q
     set attempts = q.attempts + 1
   where q.id in (
     select id from notification_queue
      where sent_at is null and attempts < 5
      order by id
      limit p_limit
      for update skip locked
   )
  returning q.*;
$$;

-- ---------------------------------------------------------------------------
-- Eliminar cuenta: quien canceló una cita puede borrarse sin romper el historial.
-- ---------------------------------------------------------------------------

alter table public.appointments
  drop constraint appointments_cancelled_by_fkey,
  add constraint appointments_cancelled_by_fkey
    foreign key (cancelled_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Permisos de las funciones nuevas
-- ---------------------------------------------------------------------------

revoke execute on function
  public.doctor_is_bookable(uuid),
  public.add_time_off(date, date, text),
  public.register_push_token(text, text),
  public.unregister_push_token(text),
  public.enqueue_reminders(),
  public.claim_notifications(integer)
from public, anon;

revoke execute on function public.enqueue_reminders(), public.claim_notifications(integer) from authenticated;
grant execute on function public.enqueue_reminders(), public.claim_notifications(integer) to service_role;

grant execute on function
  public.add_time_off(date, date, text),
  public.register_push_token(text, text),
  public.unregister_push_token(text)
to authenticated;
