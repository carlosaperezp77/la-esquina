-- Formato "Control diario de caja": envases para llevar, crédito, comandas
-- anuladas e inventario entregado (apertura) y final (cierre).

alter table public.comandas add column envases integer not null default 0 check (envases >= 0);
alter table public.comandas add column anulada_en timestamptz;

-- Crédito: se sirvió y se anota como deuda.
alter table public.comandas drop constraint comandas_pago_metodo_check;
alter table public.comandas add constraint comandas_pago_metodo_check
  check (pago_metodo in ('efectivo', 'movil', 'tarjeta', 'transferencia', 'credito'));

alter table public.jornadas add column inventario jsonb not null default '{}';   -- entregado al abrir
alter table public.cierres add column inventario_final jsonb not null default '{}';
