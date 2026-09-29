-- Stripe Connect: cada doctor recibe sus pagos en su propia cuenta conectada y
-- la plataforma se queda con una comisión (cargos a un destino).

-- Configuración global de la plataforma (una sola fila). Se edita desde el
-- panel de Supabase; la app solo la lee.
create table public.platform_settings (
  id boolean primary key default true check (id),
  fee_percent numeric(5, 2) not null default 10 check (fee_percent >= 0 and fee_percent < 100)
);
insert into public.platform_settings default values;

alter table public.platform_settings enable row level security;
create policy "leer configuración" on public.platform_settings
  for select to authenticated using (true);
revoke insert, update, delete on public.platform_settings from authenticated, anon;

-- Cuenta de Stripe de cada doctor. Tabla aparte para que los pacientes no vean
-- el id de la cuenta; solo la escriben las Edge Functions (service role).
create table public.doctor_payout_accounts (
  doctor_id uuid primary key references public.doctors (id) on delete cascade,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  -- La cuenta puede recibir transferencias: el doctor ya puede cobrar citas.
  ready boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.doctor_payout_accounts enable row level security;
create policy "doctor ve su cuenta de cobro" on public.doctor_payout_accounts
  for select to authenticated using (doctor_id = auth.uid());
revoke insert, update, delete on public.doctor_payout_accounts from authenticated, anon;

alter table public.appointments
  add column platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0);

-- ---------------------------------------------------------------------------
-- Solo los doctores que ya pueden cobrar aparecen y aceptan citas.
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
    join doctor_payout_accounts pa on pa.doctor_id = d.id and pa.ready
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

  select * into v_doc from doctors where id = p_doctor_id and is_published;
  if not found then
    raise exception 'Doctor no encontrado';
  end if;
  if not exists (select 1 from doctor_payout_accounts where doctor_id = p_doctor_id and ready) then
    raise exception 'Este doctor todavía no puede recibir pagos';
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
