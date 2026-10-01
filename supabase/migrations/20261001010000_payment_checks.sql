-- Registro de cada verificación de pago contra Stripe (para revisar fallas).
create table public.payment_checks (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  intent_status text,
  outcome text not null,
  error text,
  created_at timestamptz not null default now()
);

alter table public.payment_checks enable row level security;
