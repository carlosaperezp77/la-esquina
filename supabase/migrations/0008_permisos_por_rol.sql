-- Permisos por rol. Correr DESPUÉS de crear los usuarios de todos, porque desde
-- aquí la app ya no funciona sin entrar con usuario y clave.
-- Supabase avisa que es "destructive" porque quita los permisos de la etapa 1
-- (acceso con el enlace). No borra ningún dato. Se puede correr más de una vez.

-- Comandas: todos los que tienen usuario activo.
drop policy if exists "etapa 1: acceso con clave pública" on public.comandas;
drop policy if exists "con usuario" on public.comandas;
create policy "con usuario" on public.comandas for all to authenticated
  using (public.mi_rol() is not null) with check (public.mi_rol() is not null);

-- Apertura del día: todos la leen; solo caja, gerencia y admin la hacen.
drop policy if exists "etapa 1: acceso con clave pública" on public.jornadas;
drop policy if exists "leer jornadas" on public.jornadas;
drop policy if exists "abrir jornadas" on public.jornadas;
drop policy if exists "cambiar jornadas" on public.jornadas;
create policy "leer jornadas" on public.jornadas for select to authenticated
  using (public.mi_rol() is not null);
create policy "abrir jornadas" on public.jornadas for insert to authenticated
  with check (public.mi_rol() in ('admin', 'gerencia', 'caja'));
create policy "cambiar jornadas" on public.jornadas for update to authenticated
  using (public.mi_rol() in ('admin', 'gerencia', 'caja'));

-- Cierre de caja: igual que la apertura.
drop policy if exists "etapa 1: acceso con clave pública" on public.cierres;
drop policy if exists "leer cierres" on public.cierres;
drop policy if exists "cerrar caja" on public.cierres;
create policy "leer cierres" on public.cierres for select to authenticated
  using (public.mi_rol() is not null);
create policy "cerrar caja" on public.cierres for insert to authenticated
  with check (public.mi_rol() in ('admin', 'gerencia', 'caja'));

-- Avisos: solo teléfonos con usuario.
revoke execute on function public.guardar_suscripcion(text, text, text, text) from public, anon;
grant execute on function public.guardar_suscripcion(text, text, text, text) to authenticated;
