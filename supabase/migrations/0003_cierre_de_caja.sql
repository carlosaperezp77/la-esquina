-- Cierre de caja y moneda del efectivo.
-- Se puede correr más de una vez sin error.

-- En efectivo se puede pagar en Bs o en USD; los demás métodos son en Bs.
alter table public.comandas add column if not exists pago_moneda text check (pago_moneda in ('bs', 'usd'));

create table if not exists public.cierres (
  fecha date primary key,
  cerrado_en timestamptz not null default now(),
  fondo_bs numeric(14, 2) not null default 0 check (fondo_bs >= 0),
  fondo_usd numeric(10, 2) not null default 0 check (fondo_usd >= 0),
  contado_bs numeric(14, 2) not null check (contado_bs >= 0),
  contado_usd numeric(10, 2) not null check (contado_usd >= 0),
  observaciones text not null default '',
  resumen jsonb not null   -- foto del reporte del día al cerrar
);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cierres') then
    alter publication supabase_realtime add table public.cierres;
  end if;
end $$;

-- TEMPORAL (etapa 1): abierta a la clave pública hasta tener inicio de sesión.
alter table public.cierres enable row level security;
drop policy if exists "etapa 1: acceso con clave pública" on public.cierres;
create policy "etapa 1: acceso con clave pública" on public.cierres
  for all to anon, authenticated using (true) with check (true);
