-- Apertura del día: el cajero fija la tasa BCV y los precios en bolívares.

create table public.jornadas (
  fecha date primary key,
  tasa numeric(12, 4) not null check (tasa > 0),   -- Bs por USD
  precios jsonb not null,                           -- { "perro": 570, "bebidas": { "coca": 285, ... } } en Bs
  abierta_en timestamptz not null default now()
);

alter publication supabase_realtime add table public.jornadas;

-- TEMPORAL (etapa 1): igual que comandas, abierta a la clave pública hasta tener inicio de sesión.
alter table public.jornadas enable row level security;
create policy "etapa 1: acceso con clave pública" on public.jornadas
  for all to anon, authenticated using (true) with check (true);

-- Las comandas guardan su total en Bs; el total en USD queda como equivalente a la tasa del día.
alter table public.comandas add column total_bs numeric(14, 2) check (total_bs >= 0);
