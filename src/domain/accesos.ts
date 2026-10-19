import type { RolUsuario } from './tipos'

/** Pantallas de trabajo de la app. */
export type Pantalla = 'caja' | 'cocina' | 'mesero' | 'usuarios'

export const ROLES_USUARIO: { id: RolUsuario; nombre: string; detalle: string }[] = [
  { id: 'admin', nombre: 'Administrador', detalle: 'Todo, y crea o quita usuarios.' },
  { id: 'gerencia', nombre: 'Gerencia', detalle: 'Caja, cocina, mesero y reportes.' },
  { id: 'caja', nombre: 'Caja', detalle: 'Apertura, pedidos, cobro y cierre.' },
  { id: 'cocina', nombre: 'Cocina', detalle: 'Solo las comandas por preparar.' },
  { id: 'mesero', nombre: 'Mesero', detalle: 'Pedidos y lo que hay que servir.' },
]

export const nombreRol = (r: RolUsuario) => ROLES_USUARIO.find(x => x.id === r)?.nombre ?? r

/** Pantallas que puede abrir cada rol; la primera es la que se abre al entrar. */
export function pantallasDe(rol: RolUsuario | null): Pantalla[] {
  switch (rol) {
    case 'admin': return ['caja', 'cocina', 'mesero', 'usuarios']
    case 'gerencia': return ['caja', 'cocina', 'mesero']
    case 'caja': return ['caja']
    case 'cocina': return ['cocina']
    case 'mesero': return ['mesero']
    // Sin inicio de sesión configurado: como antes, cualquiera elige.
    default: return ['caja', 'cocina', 'mesero']
  }
}

/** Usuario guardado como correo interno, porque Supabase entra con correo. */
export const correoDe = (usuario: string) => `${usuario.trim().toLowerCase()}@la-esquina.app`

/**
 * Qué tiene de malo el usuario, en palabras claras, o null si está bien.
 * Se permiten letras sin acento, números, punto, guion y guion bajo.
 */
export function problemaUsuario(u: string): string | null {
  const usuario = u.trim().toLowerCase()
  if (!usuario) return 'Escribe un usuario.'
  if (usuario.includes('@')) return 'El usuario no es un correo: quita la @ y lo que va después. Ejemplo: carlos'
  if (/\s/.test(usuario)) return 'El usuario no puede tener espacios. Ejemplo: carlosp'
  const malos = [...new Set(usuario.replace(/[a-z0-9._-]/g, ''))]
  if (malos.length) {
    return `El usuario no puede tener ${malos.map(c => `"${c}"`).join(', ')}. Usa solo letras sin acento, números, punto o guion.`
  }
  if (usuario.length < 3) return 'El usuario debe tener al menos 3 caracteres.'
  if (usuario.length > 30) return 'El usuario debe tener 30 caracteres o menos.'
  return null
}

/** Mismo criterio que la función de Supabase. */
export function validarNuevoUsuario(n: { usuario: string; nombre: string; clave: string }): string | null {
  if (!n.nombre.trim()) return 'Escribe el nombre de la persona.'
  const errUsuario = problemaUsuario(n.usuario)
  if (errUsuario) return errUsuario
  if (n.clave.length < 6) return 'La clave debe tener al menos 6 caracteres.'
  return null
}
