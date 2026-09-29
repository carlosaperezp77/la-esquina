import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtNumero, quien, resumen, ultimoAdicional } from '../domain/calculos'
import type { Comanda } from '../domain/tipos'

/** Pitido corto con Web Audio; el navegador solo lo permite después de un toque. */
function pitar(ctx: AudioContext) {
  for (const [t, f] of [[0, 880], [0.25, 1175]] as const) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = f
    g.gain.setValueAtTime(0.3, ctx.currentTime + t)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35)
    o.connect(g).connect(ctx.destination)
    o.start(ctx.currentTime + t)
    o.stop(ctx.currentTime + t + 0.35)
  }
}

/** Texto del aviso: la comanda nueva o solo lo que se le agregó. */
export function textoAviso(c: Comanda): string {
  const a = ultimoAdicional(c)
  return a
    ? `Adicional Nº ${fmtNumero(c.numero)} · ${quien(c)}: ${resumen(a)}`
    : `Nueva comanda Nº ${fmtNumero(c.numero)} · ${quien(c)}: ${resumen(c)}`
}

/** Clave que cambia cuando a la comanda se le agrega algo. */
const clave = (c: Comanda) => `${c.id}:${c.totalBs}`

/**
 * Avisa con sonido, vibración y notificación del sistema cada vez que entra
 * a cocina una comanda nueva o un adicional. El sonido y la notificación
 * necesitan que la persona toque "Activar avisos" una vez.
 */
export function useAvisosNuevas(comandas: Comanda[]) {
  const [audio, setAudio] = useState<AudioContext | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const vistas = useRef<Set<string> | null>(null)
  const nuevas = comandas.filter(c => c.estado === 'nueva' && !c.anuladaEn && !c.pago)

  useEffect(() => {
    const claves = new Set(nuevas.map(clave))
    const llegaron = vistas.current ? nuevas.filter(c => !vistas.current!.has(clave(c))) : []
    vistas.current = claves
    if (!llegaron.length) return
    const texto = llegaron.map(textoAviso).join('\n')
    setAviso(texto)
    if (audio) pitar(audio)
    navigator.vibrate?.([300, 120, 300])
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      try { new Notification('La Esquina', { body: texto, tag: 'la-esquina-nueva' }) } catch { /* algunos móviles solo notifican desde el service worker */ }
    }
    const t = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(t)
  }, [nuevas, audio])

  const activar = useCallback(() => {
    setAudio(new AudioContext())
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
  }, [])

  return { activo: !!audio, activar, aviso, cerrarAviso: () => setAviso(null) }
}
