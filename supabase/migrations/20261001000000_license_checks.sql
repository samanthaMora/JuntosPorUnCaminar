-- Historial de consultas de cédula: evita repetir consultas que ya se
-- rechazaron (cuestan dinero) y limita intentos para que nadie adivine
-- el nombre del titular de una cédula probando nombres.
create table public.license_checks (
  id bigint generated always as identity primary key,
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  license_number text not null,
  full_name text not null,
  result text not null check (result in ('verified', 'not_found', 'name_mismatch', 'not_health')),
  created_at timestamptz not null default now()
);

create index license_checks_doctor_idx on public.license_checks (doctor_id, created_at desc);

-- Solo la función verify-license (con la llave de servicio) la usa.
alter table public.license_checks enable row level security;
