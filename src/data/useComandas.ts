import { useEffect, useState } from 'react'
import type { Comanda, Jornada } from '../domain/tipos'
import { almacen } from '.'

/** Comandas y apertura del día, que se actualizan solas cuando alguien cambia algo. */
export function useComandas() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [ultimaJornada, setUltimaJornada] = useState<Jornada | null>(null)
  const [cargado, setCargado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    const cargar = () =>
      Promise.all([almacen.listar(), almacen.ultimaJornada()]).then(
        ([cs, j]) => { if (vivo) { setComandas(cs); setUltimaJornada(j); setCargado(true); setError(null) } },
        e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) },
      )
    void cargar()
    const quitar = almacen.suscribir(() => void cargar())
    // Respaldo por si se pierde un aviso en tiempo real (p. ej. el teléfono se durmió).
    const intervalo = setInterval(() => void cargar(), 30_000)
    return () => { vivo = false; quitar(); clearInterval(intervalo) }
  }, [])

  return { comandas, ultimaJornada, cargado, error }
}
