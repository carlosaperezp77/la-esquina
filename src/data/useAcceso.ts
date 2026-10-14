import { useCallback, useEffect, useState } from 'react'
import type { EstadoAccesos, Usuario } from '../domain/tipos'
import { almacen } from '.'

async function leerAcceso(): Promise<Acceso> {
  try {
    const usuario = await almacen.sesion()
    if (usuario) return { estado: 'dentro', usuario }
    const estado = await almacen.estadoAccesos()
    return estado === 'listo' ? { estado: 'fuera' } : { estado }
  } catch (e) {
    return { estado: 'error', mensaje: e instanceof Error ? e.message : String(e) }
  }
}

export type Acceso =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: Exclude<EstadoAccesos, 'listo'> }
  | { estado: 'fuera' }
  | { estado: 'dentro'; usuario: Usuario }

/** Quién está conectado en este equipo, o qué falta para poder entrar. */
export function useAcceso() {
  const [acceso, setAcceso] = useState<Acceso>({ estado: 'cargando' })

  const revisar = useCallback(() => leerAcceso().then(setAcceso), [])

  useEffect(() => {
    let vivo = true
    leerAcceso().then(a => { if (vivo) setAcceso(a) })
    return () => { vivo = false }
  }, [])

  return { acceso, revisar, entro: (usuario: Usuario) => setAcceso({ estado: 'dentro', usuario }) }
}
