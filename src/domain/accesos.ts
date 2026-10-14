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

/** Mismo criterio que la función de Supabase. */
export function validarNuevoUsuario(n: { usuario: string; nombre: string; clave: string }): string | null {
  if (!n.nombre.trim()) return 'Escribe el nombre de la persona.'
  if (!/^[a-z0-9._-]{3,30}$/.test(n.usuario.trim().toLowerCase())) {
    return 'El usuario debe tener de 3 a 30 letras o números, sin espacios ni acentos.'
  }
  if (n.clave.length < 6) return 'La clave debe tener al menos 6 caracteres.'
  return null
}
