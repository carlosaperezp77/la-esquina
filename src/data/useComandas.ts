import { useEffect, useState } from 'react'
import type { Comanda } from '../domain/tipos'
import { almacen } from '.'

/** Lista de comandas que se actualiza sola cuando alguien cambia algo. */
export function useComandas() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    const cargar = () =>
      almacen.listar().then(
        cs => { if (vivo) { setComandas(cs); setError(null) } },
        e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) },
      )
    void cargar()
    const quitar = almacen.suscribir(() => void cargar())
    // Respaldo por si se pierde un aviso en tiempo real (p. ej. el teléfono se durmió).
    const intervalo = setInterval(() => void cargar(), 30_000)
    return () => { vivo = false; quitar(); clearInterval(intervalo) }
  }, [])

  return { comandas, error }
}
