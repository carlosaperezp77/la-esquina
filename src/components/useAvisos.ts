import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtNumero, quien, resumen, ultimoAdicional } from '../domain/calculos'
import { almacen } from '../data'
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
const pushDisponible = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

const esIphoneSinInstalar = () =>
  /iPhone|iPad/.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone

/** La clave pública viene en base64 url-safe; el navegador la quiere en bytes. */
function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, ch => ch.charCodeAt(0))
}

/** Suscribe este teléfono a los avisos del servidor. Devuelve false si no se pudo. */
async function suscribirPush(rol: 'cocina' | 'mesero', pedir: boolean): Promise<boolean> {
  if (!pushDisponible() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub && pedir) {
    const clave = await almacen.clavePush()
    if (!clave) return false
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) })
  }
  if (!sub) return false
  await almacen.guardarSuscripcion(sub.toJSON(), rol)
  return true
}

export function useAvisosNuevas(comandas: Comanda[], rol: 'cocina' | 'mesero') {
  const audio = useRef<AudioContext | null>(null)
  const [activo, setActivo] = useState(false)
  const [push, setPush] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const vistas = useRef<Set<string> | null>(null)
  const nuevas = comandas.filter(c => c.estado === 'nueva' && !c.anuladaEn && !c.pago)
  const conServidor = almacen.modo === 'en-linea'

  const activarSonido = useCallback(() => {
    audio.current ??= new AudioContext()
    void audio.current.resume()
    setActivo(true)
  }, [])

  const activar = useCallback(() => {
    activarSonido()
    if (typeof Notification === 'undefined') {
      setNota(esIphoneSinInstalar()
        ? 'En iPhone, primero agrega la app a la pantalla de inicio (Safari → Compartir → Agregar a inicio) y ábrela desde el ícono.'
        : 'Este navegador no permite notificaciones.')
      return
    }
    // En iPhone el permiso se tiene que pedir justo en el toque, antes de esperar otra cosa.
    const permiso = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission)
    void permiso.then(async p => {
      if (p !== 'granted') return setNota('Las notificaciones están bloqueadas. Actívalas en los ajustes del teléfono para esta app.')
      if (!conServidor) return setNota(null)
      try {
        const ok = await suscribirPush(rol, true)
        setPush(ok)
        setNota(ok ? null : esIphoneSinInstalar()
          ? 'Para avisos con el iPhone bloqueado, agrega la app a la pantalla de inicio y ábrela desde el ícono.'
          : 'Este teléfono solo avisará con la app abierta.')
      } catch (e) {
        setNota(`No se pudieron activar los avisos con el teléfono bloqueado: ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }, [activarSonido, conServidor, rol])

  // Si este teléfono ya estaba suscrito, se vuelve a guardar por si cambió.
  useEffect(() => {
    if (!conServidor) return
    suscribirPush(rol, false).then(setPush, () => setPush(false))
  }, [conServidor, rol])

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
    // Con avisos del servidor, la notificación ya la muestra el teléfono.
    if (!push) void notificar(texto)
    const t = setTimeout(() => setAviso(null), 10000)
    return () => clearTimeout(t)
  }, [nuevas, push])

  const faltaPermiso = typeof Notification !== 'undefined' && Notification.permission === 'default'
  const faltaPush = conServidor && !push && pushDisponible()
  return { mostrarBoton: !activo || faltaPermiso || faltaPush || !!nota, nota, activar, aviso, cerrarAviso: () => setAviso(null) }
}
