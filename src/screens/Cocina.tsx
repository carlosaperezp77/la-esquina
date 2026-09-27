import { useEffect, useRef, useState } from 'react'
import { almacen } from '../data'
import { esConTodo, fmtNumero, hora, quien, sinIngredientes } from '../domain/calculos'
import { BEBIDAS, INGREDIENTES } from '../domain/menu'
import type { Comanda, EstadoComanda } from '../domain/tipos'

const CARRILES: { estado: EstadoComanda; titulo: string; boton: string; siguiente: EstadoComanda }[] = [
  { estado: 'nueva', titulo: 'Nuevas', boton: 'Empezar', siguiente: 'preparando' },
  { estado: 'preparando', titulo: 'Preparando', boton: 'Lista', siguiente: 'lista' },
  { estado: 'lista', titulo: 'Listas para servir', boton: 'Entregada', siguiente: 'entregada' },
]

/** Pitido corto con Web Audio; el navegador solo lo permite después de un toque. */
function pitar(ctx: AudioContext) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = 880
  g.gain.setValueAtTime(0.25, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + 0.4)
}

export function Cocina({ comandas }: { comandas: Comanda[] }) {
  const [audio, setAudio] = useState<AudioContext | null>(null)
  const vistas = useRef<Set<string> | null>(null)
  const activas = comandas.filter(c => c.estado !== 'entregada')

  useEffect(() => {
    const nuevas = activas.filter(c => c.estado === 'nueva').map(c => c.id)
    if (vistas.current && audio && nuevas.some(id => !vistas.current!.has(id))) pitar(audio)
    vistas.current = new Set(nuevas)
  }, [activas, audio])

  return (
    <div className="wrap">
      {!audio && (
        <div className="send" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="btn sm" onClick={() => setAudio(new AudioContext())}>Activar sonido</button>
          <span className="msg" style={{ color: 'var(--soft)' }}>Suena cuando llega una comanda nueva.</span>
        </div>
      )}
      <div className="cocina">
        {CARRILES.map(k => {
          const cs = activas.filter(c => c.estado === k.estado)
          return (
            <section className="carril" key={k.estado}>
              <h2>{k.titulo} <span>{cs.length}</span></h2>
              {cs.length === 0 && <p className="vacio">Nada por ahora.</p>}
              {cs.map(c => <Orden key={c.id} c={c} boton={k.boton} onAvanzar={() => almacen.cambiarEstado(c.id, k.siguiente)} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Orden({ c, boton, onAvanzar }: { c: Comanda; boton: string; onAvanzar: () => Promise<void> }) {
  const [ocupado, setOcupado] = useState(false)
  const bebidas = BEBIDAS.filter(b => c.bebidas[b.id])
  return (
    <article className={`orden ${c.estado}`}>
      <header>
        <span className="n">Nº {fmtNumero(c.numero)}</span>
        <span className="h">{quien(c)} · {hora(c.creadaEn)}</span>
      </header>
      <ul>
        {c.perros.map((l, i) => {
          const sin = sinIngredientes(l)
          // Si le faltan pocos, se lee mejor "sin X"; si lleva pocos, se listan los que lleva.
          const pocos = l.ingredientes.length <= INGREDIENTES.length / 2
          return (
            <li key={i}>
              <b>{l.cant}×</b> perro {esConTodo(l) ? 'con todo' : ''}
              {!esConTodo(l) && (pocos
                ? <span className="con">solo: {INGREDIENTES.filter(x => l.ingredientes.includes(x.id)).map(x => x.nombre).join(', ')}</span>
                : <span className="sin">sin {sin.join(', ')}</span>)}
            </li>
          )
        })}
        {bebidas.map(b => <li key={b.id}><b>{c.bebidas[b.id]}×</b> {b.nombre}</li>)}
      </ul>
      {c.observaciones && <div className="obs">{c.observaciones}</div>}
      <div className="send">
        <button type="button" className="btn sm" disabled={ocupado}
          onClick={() => { setOcupado(true); onAvanzar().finally(() => setOcupado(false)) }}>{boton}</button>
      </div>
    </article>
  )
}
