-- Cierre de caja y moneda del efectivo.

-- En efectivo se puede pagar en Bs o en USD; los demás métodos son en Bs.
alter table public.comandas add column pago_moneda text check (pago_moneda in ('bs', 'usd'));

create table public.cierres (
  fecha date primary key,
  cerrado_en timestamptz not null default now(),
  fondo_bs numeric(14, 2) not null default 0 check (fondo_bs >= 0),
  fondo_usd numeric(10, 2) not null default 0 check (fondo_usd >= 0),
  contado_bs numeric(14, 2) not null check (contado_bs >= 0),
  contado_usd numeric(10, 2) not null check (contado_usd >= 0),
  observaciones text not null default '',
  resumen jsonb not null   -- foto del reporte del día al cerrar
);

alter publication supabase_realtime add table public.cierres;

-- TEMPORAL (etapa 1): abierta a la clave pública hasta tener inicio de sesión.
alter table public.cierres enable row level security;
create policy "etapa 1: acceso con clave pública" on public.cierres
  for all to anon, authenticated using (true) with check (true);
