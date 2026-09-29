-- Adicionales: lo que el cliente pide después en su misma comanda sin cobrar.
-- Ya viene sumado en perros, bebidas, envases y totales; esta lista es para
-- que cocina vea solo lo nuevo. Se puede correr más de una vez sin error.

alter table public.comandas add column if not exists adicionales jsonb not null default '[]';
