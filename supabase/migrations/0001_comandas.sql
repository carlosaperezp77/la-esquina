-- Etapa 1: comandas compartidas entre caja, cocina y meseros.

create table public.comandas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null,
  fecha date not null default (now() at time zone 'America/Caracas')::date,
  nombre text not null default '',
  mesa text not null default '',            -- '1'..'n', 'LL' = para llevar, '' = solo nombre
  perros jsonb not null default '[]',       -- [{ "cant": 2, "ingredientes": ["salchicha", ...] }]
  bebidas jsonb not null default '{}',      -- { "coca": 2, "agua": 1 }
  observaciones text not null default '',
  tasa numeric(12, 4) not null check (tasa > 0),       -- Bs por USD al crear la comanda
  total_usd numeric(10, 2) not null check (total_usd >= 0),
  estado text not null default 'nueva'
    check (estado in ('nueva', 'preparando', 'lista', 'entregada')),
  creada_en timestamptz not null default now(),
  lista_en timestamptz,
  entregada_en timestamptz,
  pago_metodo text check (pago_metodo in ('efectivo', 'movil', 'tarjeta', 'transferencia')),
  pago_referencia text,
  cobrada_en timestamptz,
  unique (fecha, numero)
);

create index comandas_fecha_idx on public.comandas (fecha);
create index comandas_sin_cobrar_idx on public.comandas (creada_en) where cobrada_en is null;

-- Número de comanda del día: 1, 2, 3... y vuelve a 1 al día siguiente.
create function public.asignar_numero_comanda() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('comandas:' || new.fecha::text));
  select coalesce(max(numero), 0) + 1 into new.numero
    from public.comandas where fecha = new.fecha;
  return new;
end $$;

create trigger comandas_numero
  before insert on public.comandas
  for each row execute function public.asignar_numero_comanda();

-- Los cambios llegan en vivo a todos los equipos.
alter publication supabase_realtime add table public.comandas;

-- TEMPORAL (etapa 1): cualquiera con la clave pública puede leer y escribir.
-- Antes de usarla en el local se reemplaza por inicio de sesión con roles.
alter table public.comandas enable row level security;
create policy "etapa 1: acceso con clave pública" on public.comandas
  for all to anon, authenticated using (true) with check (true);
