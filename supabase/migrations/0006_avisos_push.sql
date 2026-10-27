-- Avisos con el teléfono bloqueado (Web Push).
-- Cada teléfono que toca "Activar avisos" guarda aquí su suscripción, y cada
-- comanda nueva o adicional llama a la función avisar-comanda, que manda el
-- aviso por los servidores de Apple y Google. Se puede correr más de una vez.

create extension if not exists pg_net;

create table if not exists public.suscripciones_push (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  rol text not null check (rol in ('cocina', 'mesero')),
  creada_en timestamptz not null default now()
);

-- Nadie lee esta tabla desde la app: cada teléfono solo guarda la suya con
-- guardar_suscripcion(), y la función de avisos la lee con su clave interna.
alter table public.suscripciones_push enable row level security;

create or replace function public.guardar_suscripcion(p_endpoint text, p_p256dh text, p_auth text, p_rol text)
returns void language sql security definer set search_path = public as $$
  insert into public.suscripciones_push (endpoint, p256dh, auth, rol)
  values (p_endpoint, p_p256dh, p_auth, p_rol)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, rol = excluded.rol;
$$;
grant execute on function public.guardar_suscripcion(text, text, text, text) to anon, authenticated;

-- Claves del servidor de avisos. Las crea la función la primera vez; nadie
-- más las puede leer (sin políticas, solo la función con su clave interna).
create table if not exists public.config_push (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada text not null
);
alter table public.config_push enable row level security;

-- Llama a la función cuando entra una comanda nueva o se le agrega algo.
create or replace function public.avisar_comanda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.anulada_en is null and new.cobrada_en is null and new.estado = 'nueva'
     and (tg_op = 'INSERT' or new.total_bs is distinct from old.total_bs) then
    perform net.http_post(
      url := 'https://xrlndffypfmwtsnanmiz.supabase.co/functions/v1/avisar-comanda',
      body := jsonb_build_object('id', new.id, 'tipo', case when tg_op = 'INSERT' then 'nueva' else 'adicional' end),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end $$;

drop trigger if exists avisar_comanda on public.comandas;
create trigger avisar_comanda after insert or update on public.comandas
  for each row execute function public.avisar_comanda();
