-- Esquema inicial: doctores, pacientes, horarios y citas pagadas por adelantado.
--
-- Reglas de negocio que se garantizan aquí (y no solo en la app):
--   * Un doctor nunca tiene dos citas activas que se traslapen (exclusion constraint).
--   * Una cita nace en 'pending_payment' y aparta el horario unos minutos; solo el
--     webhook de Stripe la pasa a 'confirmed'.
--   * El paciente no puede reprogramar ni cancelar dentro de las
--     `change_cutoff_hours` previas a la cita (configurable por doctor).

create extension if not exists btree_gist;
create extension if not exists unaccent;

create type public.user_role as enum ('doctor', 'patient');
create type public.appointment_status as enum ('pending_payment', 'confirmed', 'cancelled', 'expired');

-- Minutos que un horario queda apartado mientras el paciente paga.
create or replace function public.payment_hold_minutes() returns integer
language sql immutable as $$ select 15 $$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key references public.profiles (id) on delete cascade,
  -- Código corto que el doctor comparte con sus pacientes (ej. "DRLOPEZ").
  public_code text not null unique check (public_code ~ '^[A-Z0-9]{4,12}$'),
  specialty text not null default '',
  city text not null default '',
  address text not null default '',
  bio text not null default '',
  -- Stripe exige un mínimo de $10.00 MXN por cobro.
  price_cents integer not null default 50000 check (price_cents >= 1000),
  currency text not null default 'mxn',
  slot_minutes integer not null default 30 check (slot_minutes between 10 and 240),
  -- Horas antes de la cita a partir de las cuales el paciente ya no puede cambiarla.
  change_cutoff_hours integer not null default 24 check (change_cutoff_hours between 0 and 720),
  timezone text not null default 'America/Mexico_City',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
create index on public.availability_rules (doctor_id, weekday);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (starts_at < ends_at)
);
create index on public.time_off (doctor_id, starts_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending_payment',
  price_cents integer not null,
  currency text not null,
  hold_expires_at timestamptz,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  constraint appointments_no_overlap exclude using gist (
    doctor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending_payment', 'confirmed'))
);
create index on public.appointments (patient_id, starts_at);
create index on public.appointments (doctor_id, starts_at);

-- ---------------------------------------------------------------------------
-- Alta de usuarios: el rol y el nombre llegan en los metadatos del sign up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := coalesce(new.raw_user_meta_data ->> 'role', 'patient')::public.user_role;
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Sin nombre');
  v_code text;
begin
  insert into public.profiles (id, role, full_name) values (new.id, v_role, v_name);

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Horarios disponibles
-- ---------------------------------------------------------------------------

-- Libera los apartados cuyo tiempo para pagar ya venció.
create or replace function public.release_expired_holds() returns void
language sql security definer set search_path = public as $$
  update appointments
     set status = 'expired'
   where status = 'pending_payment'
     and hold_expires_at < now();
$$;

-- Horarios libres de un doctor entre dos fechas (en la zona horaria del doctor).
create or replace function public.get_available_slots(p_doctor_id uuid, p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_doc doctors;
begin
  select * into v_doc from doctors where id = p_doctor_id;
  if not found then
    return;
  end if;
  if p_to - p_from > 62 then
    raise exception 'El rango máximo es de 62 días';
  end if;

  return query
  with days as (
    select d::date as day
      from generate_series(p_from, p_to, interval '1 day') d
  ),
  candidates as (
    select (s at time zone v_doc.timezone) as starts_at,
           ((s + make_interval(mins => v_doc.slot_minutes)) at time zone v_doc.timezone) as ends_at
      from days
      join availability_rules r
        on r.doctor_id = v_doc.id
       and r.weekday = extract(dow from days.day)
      cross join lateral generate_series(
        days.day + r.start_time,
        days.day + r.end_time - make_interval(mins => v_doc.slot_minutes),
        make_interval(mins => v_doc.slot_minutes)
      ) s
  )
  select distinct c.starts_at, c.ends_at
    from candidates c
   where c.starts_at > now()
     and not exists (
       select 1 from appointments a
        where a.doctor_id = v_doc.id
          and (a.status = 'confirmed'
               or (a.status = 'pending_payment' and a.hold_expires_at > now()))
          and tstzrange(a.starts_at, a.ends_at) && tstzrange(c.starts_at, c.ends_at)
     )
     and not exists (
       select 1 from time_off t
        where t.doctor_id = v_doc.id
          and tstzrange(t.starts_at, t.ends_at) && tstzrange(c.starts_at, c.ends_at)
     )
   order by c.starts_at;
end $$;

create or replace function public.is_slot_available(p_doctor_id uuid, p_starts_at timestamptz)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from doctors d,
           lateral get_available_slots(
             d.id,
             (p_starts_at at time zone d.timezone)::date,
             (p_starts_at at time zone d.timezone)::date
           ) s
     where d.id = p_doctor_id
       and s.starts_at = p_starts_at
  );
$$;

-- ---------------------------------------------------------------------------
-- Búsqueda de doctores (por nombre, especialidad, ciudad o código)
-- ---------------------------------------------------------------------------

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
   where d.is_published
     and (
       coalesce(trim(p_query), '') = ''
       or d.public_code = upper(trim(p_query))
       or unaccent(p.full_name || ' ' || d.specialty || ' ' || d.city)
          ilike '%' || unaccent(trim(p_query)) || '%'
     )
   order by (d.public_code = upper(trim(p_query))) desc, p.full_name
   limit 50;
$$;

-- ---------------------------------------------------------------------------
-- Ciclo de vida de una cita
-- ---------------------------------------------------------------------------

-- Crea una cita pendiente de pago que aparta el horario. La llama la Edge
-- Function `create-booking` con el JWT del paciente.
create or replace function public.create_pending_appointment(p_doctor_id uuid, p_starts_at timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_doc doctors;
  v_appt appointments;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'patient') then
    raise exception 'Solo los pacientes pueden agendar citas';
  end if;

  select * into v_doc from doctors where id = p_doctor_id and is_published;
  if not found then
    raise exception 'Doctor no encontrado';
  end if;

  perform release_expired_holds();

  -- Un paciente solo aparta un horario a la vez: si abandonó un pago, se libera.
  update appointments
     set status = 'expired'
   where patient_id = auth.uid()
     and status = 'pending_payment';

  if not is_slot_available(p_doctor_id, p_starts_at) then
    raise exception 'Ese horario ya no está disponible';
  end if;

  insert into appointments (doctor_id, patient_id, starts_at, ends_at, price_cents, currency, hold_expires_at)
  values (
    p_doctor_id, auth.uid(), p_starts_at,
    p_starts_at + make_interval(mins => v_doc.slot_minutes),
    v_doc.price_cents, v_doc.currency,
    now() + make_interval(mins => payment_hold_minutes())
  )
  returning * into v_appt;

  return v_appt;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no está disponible';
end $$;

-- El paciente cerró la pantalla de pago sin pagar: libera el horario ya.
create or replace function public.release_hold(p_appointment_id uuid) returns void
language sql security definer set search_path = public as $$
  update appointments
     set status = 'expired'
   where id = p_appointment_id
     and patient_id = auth.uid()
     and status = 'pending_payment';
$$;

-- Confirma el pago (solo lo llama el webhook con la service role).
-- Si el apartado ya había vencido se intenta confirmar de todos modos; si el
-- horario lo tomó alguien más devuelve false y el webhook reembolsa.
create or replace function public.confirm_payment(p_payment_intent_id text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
begin
  select * into v_appt from appointments where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then
    raise exception 'No existe una cita para el pago %', p_payment_intent_id;
  end if;
  if v_appt.status = 'confirmed' then
    return true;
  end if;
  if v_appt.status = 'cancelled' then
    return false;
  end if;

  begin
    update appointments
       set status = 'confirmed', paid_at = now(), hold_expires_at = null
     where id = v_appt.id;
  exception when exclusion_violation then
    update appointments
       set status = 'cancelled', cancelled_at = now()
     where id = v_appt.id;
    return false;
  end;
  return true;
end $$;

-- ¿Puede el paciente todavía cambiar/cancelar esta cita?
create or replace function public.change_deadline(p_appointment_id uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select a.starts_at - make_interval(hours => d.change_cutoff_hours)
    from appointments a join doctors d on d.id = a.doctor_id
   where a.id = p_appointment_id;
$$;

create or replace function public.reschedule_appointment(p_appointment_id uuid, p_new_starts_at timestamptz)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_doc doctors;
begin
  select * into v_appt from appointments
   where id = p_appointment_id and patient_id = auth.uid()
   for update;
  if not found then
    raise exception 'Cita no encontrada';
  end if;
  if v_appt.status <> 'confirmed' then
    raise exception 'Solo se pueden reprogramar citas confirmadas';
  end if;

  select * into v_doc from doctors where id = v_appt.doctor_id;
  if now() > v_appt.starts_at - make_interval(hours => v_doc.change_cutoff_hours) then
    raise exception 'Ya no es posible cambiar esta cita (faltan menos de % horas)', v_doc.change_cutoff_hours;
  end if;

  perform release_expired_holds();
  if not is_slot_available(v_appt.doctor_id, p_new_starts_at) then
    raise exception 'Ese horario ya no está disponible';
  end if;

  update appointments
     set starts_at = p_new_starts_at,
         ends_at = p_new_starts_at + (v_appt.ends_at - v_appt.starts_at)
   where id = v_appt.id
  returning * into v_appt;
  return v_appt;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no está disponible';
end $$;

-- Cancela una cita. El paciente solo puede antes del límite; el doctor siempre.
-- Devuelve la cita para que la Edge Function `cancel-appointment` reembolse.
create or replace function public.cancel_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_cutoff integer;
begin
  select * into v_appt from appointments
   where id = p_appointment_id
     and (patient_id = auth.uid() or doctor_id = auth.uid())
   for update;
  if not found then
    raise exception 'Cita no encontrada';
  end if;
  if v_appt.status <> 'confirmed' then
    raise exception 'Solo se pueden cancelar citas confirmadas';
  end if;

  if v_appt.patient_id = auth.uid() then
    select change_cutoff_hours into v_cutoff from doctors where id = v_appt.doctor_id;
    if now() > v_appt.starts_at - make_interval(hours => v_cutoff) then
      raise exception 'Ya no es posible cancelar esta cita (faltan menos de % horas)', v_cutoff;
    end if;
  elsif v_appt.starts_at < now() then
    raise exception 'La cita ya pasó';
  end if;

  update appointments
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid()
   where id = v_appt.id
  returning * into v_appt;
  return v_appt;
end $$;

-- ---------------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.availability_rules enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;

create policy "ver perfil propio, de doctores y de mis pacientes" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or role = 'doctor'
    or exists (select 1 from public.appointments a
                where a.doctor_id = auth.uid() and a.patient_id = profiles.id)
  );
create policy "editar perfil propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- El rol no se puede cambiar desde la app.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "ver doctores publicados" on public.doctors
  for select to authenticated using (is_published or id = auth.uid());
create policy "doctor edita su ficha" on public.doctors
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.doctors from authenticated;
grant update (public_code, specialty, city, address, bio, price_cents, slot_minutes,
              change_cutoff_hours, is_published) on public.doctors to authenticated;

create policy "ver horarios" on public.availability_rules
  for select to authenticated using (true);
create policy "doctor administra sus horarios" on public.availability_rules
  for all to authenticated using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

create policy "doctor administra sus ausencias" on public.time_off
  for all to authenticated using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- Las citas solo se leen directo; todo cambio pasa por las funciones de arriba.
create policy "ver mis citas" on public.appointments
  for select to authenticated using (patient_id = auth.uid() or doctor_id = auth.uid());

-- Funciones: solo usuarios autenticados; las de pagos solo la service role.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.get_available_slots(uuid, date, date),
  public.search_doctors(text),
  public.create_pending_appointment(uuid, timestamptz),
  public.release_hold(uuid),
  public.change_deadline(uuid),
  public.reschedule_appointment(uuid, timestamptz),
  public.cancel_appointment(uuid)
to authenticated;
revoke execute on function public.confirm_payment(text) from authenticated;
grant execute on function public.confirm_payment(text) to service_role;
