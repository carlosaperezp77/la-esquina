import { useState } from 'react'
import { BotonActivarAvisos } from '../components/Avisos'
import { useAvisosNuevas } from '../components/useAvisos'
import { almacen } from '../data'
import { esConTodo, fmtNumero, hora, quien, resumen, sinIngredientes, sinUltimoAdicional, ultimoAdicional } from '../domain/calculos'
import { BEBIDAS, INGREDIENTES } from '../domain/menu'
import type { Comanda, EstadoComanda } from '../domain/tipos'

const CARRILES: { estado: EstadoComanda; titulo: string; boton: string; siguiente: EstadoComanda }[] = [
  { estado: 'nueva', titulo: 'Nuevas', boton: 'Empezar', siguiente: 'preparando' },
  { estado: 'preparando', titulo: 'Preparando', boton: 'Lista', siguiente: 'lista' },
  { estado: 'lista', titulo: 'Listas para servir', boton: 'Entregada', siguiente: 'entregada' },
]

export function Cocina({ comandas }: { comandas: Comanda[] }) {
  const { mostrarBoton, nota, activar, aviso, cerrarAviso } = useAvisosNuevas(comandas, 'cocina')
  const activas = comandas.filter(c => c.estado !== 'entregada' && !c.anuladaEn)

  return (
    <div className="wrap">
      {mostrarBoton && <BotonActivarAvisos activar={activar} nota={nota} />}
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
      {aviso && <button type="button" className="aviso nueva" role="status" onClick={cerrarAviso}>{aviso}</button>}
    </div>
  )
}

/** Perros, bebidas y envases de una comanda o de un adicional. */
function Items({ p }: { p: Pick<Comanda, 'perros' | 'bebidas' | 'envases'> }) {
  const bebidas = BEBIDAS.filter(b => p.bebidas[b.id])
  return (
    <ul>
      {p.perros.map((l, i) => {
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
      {bebidas.map(b => <li key={b.id}><b>{p.bebidas[b.id]}×</b> {b.nombre}</li>)}
      {p.envases > 0 && <li><b>{p.envases}×</b> envase para llevar</li>}
    </ul>
  )
}

function Orden({ c, boton, onAvanzar }: { c: Comanda; boton: string; onAvanzar: () => Promise<void> }) {
  const [ocupado, setOcupado] = useState(false)
  const adicional = ultimoAdicional(c)
  const previo = adicional ? resumen(sinUltimoAdicional(c)) : ''
  return (
    <article className={`orden ${c.estado}${adicional ? ' con-adicional' : ''}`}>
      <header>
        <span className="n">Nº {fmtNumero(c.numero)}</span>
        <span className="h">{quien(c)} · {hora(adicional?.creadoEn ?? c.creadaEn)}</span>
      </header>
      {adicional ? (
        <>
          <span className="tag-adicional">Adicional</span>
          <Items p={adicional} />
          {adicional.observaciones && <div className="obs">{adicional.observaciones}</div>}
          {previo && <p className="ya-servido">Ya servido: {previo}</p>}
        </>
      ) : <Items p={c} />}
      {!adicional && c.observaciones && <div className="obs">{c.observaciones}</div>}
      <div className="send">
        <button type="button" className="btn sm" disabled={ocupado}
          onClick={() => { setOcupado(true); onAvanzar().finally(() => setOcupado(false)) }}>{boton}</button>
      </div>
    </article>
  )
}
