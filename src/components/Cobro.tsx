import { useState } from 'react'
import { almacen } from '../data'
import { fmtBs, fmtNumero, fmtUsd, hora, quien, resumen } from '../domain/calculos'
import { METODOS_PAGO } from '../domain/menu'
import type { Comanda, EstadoComanda, MetodoPago, Moneda } from '../domain/tipos'
import { IconoCredito } from './Iconos'
import { IconoTransferencia } from './IconoTransferencia'

const ESTADO: Record<EstadoComanda, string> = {
  nueva: 'En cola',
  preparando: 'Preparando',
  lista: 'Lista',
  entregada: 'Comiendo',
}

export function TarjetaComanda({ c, children }: { c: Comanda; children?: React.ReactNode }) {
  const pagada = !!c.pago
  const metodo = METODOS_PAGO.find(m => m.id === c.pago?.metodo)?.nombre
  return (
    <div className={`tk${pagada ? ' done' : ''}`}>
      <div className="tk-top">
        <span className="n">Nº {fmtNumero(c.numero)}</span>
        <span>
          {quien(c)}
          <span className={`chip${pagada ? ' paid' : c.estado === 'entregada' ? '' : ' info'}`}>
            {pagada ? (c.pago!.metodo === 'credito' ? 'A crédito' : 'Pagada') : ESTADO[c.estado]}
          </span>
          <br />
          <span className="d">
            {pagada
              ? `${metodo}${c.pago?.moneda ? (c.pago.moneda === 'usd' ? ' en $' : ' en Bs') : ''}${c.pago?.referencia ? ` · ref. ${c.pago.referencia}` : ''} · ${hora(c.pago!.cobradaEn)}`
              : `${resumen(c)} · ${hora(c.creadaEn)}`}
          </span>
        </span>
        <span className="t">Bs {fmtBs(c.totalBs)}<span className="d">${fmtUsd(c.totalUsd)}</span></span>
      </div>
      {children}
    </div>
  )
}

/** Tarjeta "por cobrar" con el panel de forma de pago del prototipo. */
export function PorCobrar({ c }: { c: Comanda }) {
  const [abierto, setAbierto] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPago | null>(null)
  const [referencia, setReferencia] = useState('')
  const [moneda, setMoneda] = useState<Moneda | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [anulando, setAnulando] = useState(false)
  const pideRef = METODOS_PAGO.find(m => m.id === metodo)?.pideReferencia ?? false

  const confirmar = async () => {
    if (!metodo) return setError('Elige la forma de pago.')
    if (pideRef && !referencia.trim()) return setError('Anota la referencia del pago.')
    if (metodo === 'efectivo' && !moneda) return setError('Indica si pagó en bolívares o en dólares.')
    setGuardando(true)
    try {
      await almacen.cobrar(c.id, metodo, pideRef ? referencia.trim() : null, metodo === 'efectivo' ? moneda : null)
    } catch (e) {
      setError(`No se pudo guardar el pago: ${e instanceof Error ? e.message : String(e)}`)
      setGuardando(false)
    }
  }

  return (
    <TarjetaComanda c={c}>
      {!abierto ? (
        <div className="acts">
          {anulando && <span className="msg err">¿Anular esta comanda? Sale de cocina y no cuenta como venta.</span>}
          <button type="button" className={`btn ghost sm${anulando ? ' peligro-txt' : ''}`}
            onClick={() => (anulando ? void almacen.anular(c.id) : setAnulando(true))}>
            {anulando ? 'Sí, anular' : 'Anular'}
          </button>
          {anulando
            ? <button type="button" className="btn sm" onClick={() => setAnulando(false)}>No</button>
            : <button type="button" className="btn sm" onClick={() => setAbierto(true)}>Cobrar</button>}
        </div>
      ) : (
        <div className="paybox">
          <span className="lbl" style={{ fontSize: 19 }}>Forma de pago</span>
          <div className="opts pay">
            {METODOS_PAGO.map(m => (
              <div className="opt" key={m.id}>
                <button type="button" className="big" aria-label={m.nombre} onClick={() => { setMetodo(m.id); setError('') }}>
                  {m.icono ? <img src={m.icono} alt="" /> : m.id === 'credito' ? <IconoCredito /> : <IconoTransferencia />}
                </button>
                <small>{m.nombre}</small>
                <button type="button" className="sq" aria-pressed={metodo === m.id} aria-label={`Pagar con ${m.nombre}`}
                  onClick={() => { setMetodo(m.id); setError('') }} />
              </div>
            ))}
          </div>
          {metodo === 'efectivo' && (
            <div className="monedas" role="group" aria-label="Moneda del efectivo">
              <button type="button" aria-pressed={moneda === 'bs'} onClick={() => { setMoneda('bs'); setError('') }}>
                En Bs <b>{fmtBs(c.totalBs)}</b>
              </button>
              <button type="button" aria-pressed={moneda === 'usd'} onClick={() => { setMoneda('usd'); setError('') }}>
                En $ <b>{fmtUsd(c.totalUsd)}</b>
              </button>
            </div>
          )}
          {pideRef && (
            <label className="ref">
              <span className="lbl" style={{ fontSize: 16 }}>Ref.:</span>
              <input className="box" inputMode="numeric" placeholder="Últimos 4 a 6 dígitos"
                value={referencia} onChange={e => setReferencia(e.target.value)} />
            </label>
          )}
          <div className="row">
            <span className="msg err" role="status">{error}</span>
            <button type="button" className="btn ghost sm" onClick={() => { setAbierto(false); setError('') }}>Cancelar</button>
            <button type="button" className="btn sm" disabled={guardando} onClick={confirmar}>Confirmar pago</button>
          </div>
        </div>
      )}
    </TarjetaComanda>
  )
}
