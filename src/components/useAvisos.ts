import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtNumero, quien, resumen, ultimoAdicional } from '../domain/calculos'
import type { Comanda } from '../domain/tipos'

/** Tres pitidos fuertes con Web Audio; el navegador solo lo permite después de un toque. */
async function pitar(ctx: AudioContext) {
  if (ctx.state !== 'running') await ctx.resume().catch(() => {})
  const t0 = ctx.currentTime + 0.05
  for (const [t, f] of [[0, 880], [0.3, 1175], [0.6, 1568]] as const) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t0 + t)
    g.gain.exponentialRampToValueAtTime(0.5, t0 + t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.28)
    o.connect(g).connect(ctx.destination)
    o.start(t0 + t)
    o.stop(t0 + t + 0.3)
  }
}

const VIBRACION = [400, 150, 400, 150, 400]

/**
 * Notificación del sistema desde el service worker: es la que suena y vibra en
 * Android aunque la app esté en segundo plano. Cada aviso lleva su propia
 * etiqueta para que el teléfono no lo junte en silencio con el anterior.
 */
async function notificar(texto: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const opciones: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: texto, tag: `la-esquina-${Date.now()}`, renotify: true, vibrate: VIBRACION,
    requireInteraction: true, silent: false, icon: 'icono-192.png', badge: 'icono-192.png',
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return await reg.showNotification('La Esquina', opciones)
    new Notification('La Esquina', opciones)
  } catch { /* sin notificación, queda el aviso en pantalla */ }
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
 * a cocina una comanda nueva o un adicional. El sonido necesita un toque en
 * la pantalla después de abrir la app, y la notificación, el permiso.
 */
export function useAvisosNuevas(comandas: Comanda[]) {
  const audio = useRef<AudioContext | null>(null)
  const [activo, setActivo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const vistas = useRef<Set<string> | null>(null)
  const nuevas = comandas.filter(c => c.estado === 'nueva' && !c.anuladaEn && !c.pago)

  const activarSonido = useCallback(() => {
    audio.current ??= new AudioContext()
    void audio.current.resume()
    setActivo(true)
  }, [])

  const activar = useCallback(() => {
    activarSonido()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
  }, [activarSonido])

  // Cualquier toque en la pantalla sirve para activar el sonido, así no hay
  // que volver a tocar el botón cada vez que se recarga la app.
  useEffect(() => {
    const alTocar = () => activarSonido()
    document.addEventListener('pointerdown', alTocar)
    return () => document.removeEventListener('pointerdown', alTocar)
  }, [activarSonido])

  useEffect(() => {
    const claves = new Set(nuevas.map(clave))
    const llegaron = vistas.current ? nuevas.filter(c => !vistas.current!.has(clave(c))) : []
    vistas.current = claves
    if (!llegaron.length) return
    const texto = llegaron.map(textoAviso).join('\n')
    setAviso(texto)
    if (audio.current) void pitar(audio.current)
    navigator.vibrate?.(VIBRACION)
    void notificar(texto)
    const t = setTimeout(() => setAviso(null), 10000)
    return () => clearTimeout(t)
  }, [nuevas])

  const faltaPermiso = typeof Notification !== 'undefined' && Notification.permission === 'default'
  return { mostrarBoton: !activo || faltaPermiso, activar, aviso, cerrarAviso: () => setAviso(null) }
}
