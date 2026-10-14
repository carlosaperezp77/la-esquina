// Función de Supabase (Edge Function) para los accesos por usuario.
//
// POST { accion, ... }:
// - "estado": dice si ya existe el administrador (la usa la pantalla de entrar).
// - "crear-admin": crea el primer administrador. Solo funciona mientras no
//   haya ninguno; después queda cerrada.
// - "listar", "crear", "cambiar", "borrar": solo para el administrador
//   conectado (la app manda su sesión en el encabezado Authorization).
//
// Se publica desde el panel de Supabase con "Verify JWT" desactivado, porque
// la pantalla de entrar la llama antes de que haya sesión. Cada acción revisa
// por su cuenta quién la pide.

import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

class Falla extends Error {
  constructor(mensaje: string, readonly status = 400) { super(mensaje) }
}

const ROLES = ['admin', 'gerencia', 'caja', 'cocina', 'mesero']
/** Igual que en la app: el usuario se guarda como correo interno. */
const correo = (usuario: string) => `${usuario}@la-esquina.app`

function validarUsuario(u: unknown): string {
  const usuario = String(u ?? '').trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    throw new Falla('El usuario debe tener de 3 a 30 letras o números, sin espacios ni acentos.')
  }
  return usuario
}
function validarClave(c: unknown): string {
  const clave = String(c ?? '')
  if (clave.length < 6) throw new Falla('La clave debe tener al menos 6 caracteres.')
  return clave
}
function validarRol(r: unknown): string {
  if (!ROLES.includes(String(r))) throw new Falla('Rol no válido.')
  return String(r)
}
function validarNombre(n: unknown): string {
  const nombre = String(n ?? '').trim()
  if (!nombre) throw new Falla('Escribe el nombre de la persona.')
  return nombre
}

async function hayAdmin() {
  const { count, error } = await db.from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'admin').eq('activo', true)
  if (error) throw error
  return (count ?? 0) > 0
}

/** Revisa que quien llama sea un administrador activo y devuelve su id. */
async function admin(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Falla('Hay que entrar como administrador.', 401)
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw new Falla('La sesión venció. Vuelve a entrar.', 401)
  const { data: p } = await db.from('perfiles').select('rol, activo').eq('id', data.user.id).maybeSingle()
  if (p?.rol !== 'admin' || !p.activo) throw new Falla('Solo el administrador puede manejar usuarios.', 403)
  return data.user.id
}

async function crear(b: Record<string, unknown>, rol: string) {
  const usuario = validarUsuario(b.usuario)
  const nombre = validarNombre(b.nombre)
  const clave = validarClave(b.clave)
  const { data: existe } = await db.from('perfiles').select('id').eq('usuario', usuario).maybeSingle()
  if (existe) throw new Falla(`Ya existe el usuario "${usuario}".`)
  const { data, error } = await db.auth.admin.createUser({
    email: correo(usuario), password: clave, email_confirm: true, user_metadata: { nombre },
  })
  if (error) throw new Falla(error.message.includes('already') ? `Ya existe el usuario "${usuario}".` : error.message)
  const { error: e2 } = await db.from('perfiles').insert({ id: data.user.id, usuario, nombre, rol })
  if (e2) {
    await db.auth.admin.deleteUser(data.user.id)
    throw e2
  }
  return { id: data.user.id }
}

async function listar() {
  const { data, error } = await db.from('perfiles').select('id, usuario, nombre, rol, activo, creado_en').order('creado_en')
  if (error) throw error
  return data
}

async function cambiar(b: Record<string, unknown>, yo: string) {
  const id = String(b.id ?? '')
  const cambios: Record<string, unknown> = {}
  if (b.nombre !== undefined) cambios.nombre = validarNombre(b.nombre)
  if (b.rol !== undefined) cambios.rol = validarRol(b.rol)
  if (b.activo !== undefined) cambios.activo = Boolean(b.activo)
  if (id === yo && (cambios.activo === false || (cambios.rol && cambios.rol !== 'admin'))) {
    throw new Falla('No puedes quitarte a ti mismo el acceso de administrador.')
  }
  if (Object.keys(cambios).length) {
    const { error } = await db.from('perfiles').update(cambios).eq('id', id)
    if (error) throw error
  }
  if (b.clave !== undefined) {
    const { error } = await db.auth.admin.updateUserById(id, { password: validarClave(b.clave) })
    if (error) throw new Falla(error.message)
  }
  return { ok: true }
}

async function borrar(b: Record<string, unknown>, yo: string) {
  const id = String(b.id ?? '')
  if (id === yo) throw new Falla('No puedes borrar tu propio usuario.')
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) throw new Falla(error.message)
  return { ok: true }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Usa POST.' }, 405)
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>
    switch (b.accion) {
      case 'estado':
        return json({ hayAdmin: await hayAdmin() })
      case 'crear-admin':
        if (await hayAdmin()) throw new Falla('El administrador ya existe. Entra con tu usuario.', 403)
        return json(await crear(b, 'admin'))
      case 'listar':
        await admin(req)
        return json(await listar())
      case 'crear':
        await admin(req)
        return json(await crear(b, validarRol(b.rol)))
      case 'cambiar':
        return json(await cambiar(b, await admin(req)))
      case 'borrar':
        return json(await borrar(b, await admin(req)))
      default:
        throw new Falla('Acción desconocida.')
    }
  } catch (e) {
    const status = e instanceof Falla ? e.status : 500
    return json({ error: e instanceof Error ? e.message : String(e) }, status)
  }
})
