-- Accesos por usuario.
-- Cada persona entra con su usuario y su clave. Esta tabla dice qué rol tiene
-- cada una: admin (Carlos), gerencia, caja, cocina o mesero.
-- Los usuarios los crea el administrador desde la app (función "usuarios").
-- No cambia los permisos de las comandas todavía: eso lo hace 0008, cuando
-- todos ya entren con su usuario. Se puede correr más de una vez.

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique,
  nombre text not null,
  rol text not null check (rol in ('admin', 'gerencia', 'caja', 'cocina', 'mesero')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.perfiles enable row level security;

-- Rol de quien está conectado (null si no entró o está desactivado).
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo;
$$;
grant execute on function public.mi_rol() to anon, authenticated;

-- Cada uno ve su propio perfil; admin y gerencia ven todos.
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.mi_rol() in ('admin', 'gerencia'));
-- Crear, cambiar y borrar usuarios solo lo hace la función "usuarios".
