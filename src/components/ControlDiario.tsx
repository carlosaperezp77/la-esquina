import { Fragment } from 'react'
import { fmtBs, fmtNumero, fmtUsd, totalPerros } from '../domain/calculos'
import { BEBIDAS, INSUMOS } from '../domain/menu'
import { deberiaQuedar, usado } from '../domain/inventario'
import { totalMetodoBs } from '../domain/reporte'
import type { BebidaId, Comanda, Inventario, Jornada, MetodoPago, ResumenDia } from '../domain/tipos'
import perroBanner from '../assets/reporte/perro.png'
import efectivo from '../assets/iconos/efectivo.png'
import movil from '../assets/iconos/movil.png'
import tarjeta from '../assets/iconos/tarjeta.png'
import { IconoCredito, IconoEnvase } from './Iconos'
import { IconoTransferencia } from './IconoTransferencia'
import './ControlDiario.css'

const PLURAL: Record<BebidaId, string> = {
  nestea: 'nesteas', refresco: 'refrescos', refresco1l: 'refrescos de 1 L', refresco2l: 'refrescos de 2 L', agua: 'aguas',
}

/** Ícono de la bebida con su tamaño encima, si tiene. */
const IconoBebida = ({ b }: { b: (typeof BEBIDAS)[number] }) => (
  <span className="cd-beb"><img src={b.icono} alt="" />{b.tam && <i>{b.tam}</i>}</span>
)

/** Filas mínimas de la tabla, como la hoja impresa. */
const FILAS_MINIMAS = 25

const METODOS: { id: MetodoPago; nombre: string; icono: React.ReactNode }[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: <img src={efectivo} alt="" /> },
  { id: 'movil', nombre: 'Pago móvil', icono: <img src={movil} alt="" /> },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: <img src={tarjeta} alt="" /> },
  { id: 'transferencia', nombre: 'Transf.', icono: <IconoTransferencia /> },
  { id: 'credito', nombre: 'Crédito', icono: <IconoCredito /> },
]

const Corazon = () => (
  <svg className="cd-corazon" viewBox="0 0 24 22" aria-hidden="true">
    <path d="M12 21s-9-6.2-9-12.2A5 5 0 0 1 12 5.6a5 5 0 0 1 9 3.2C21 14.8 12 21 12 21z" fill="currentColor" />
  </svg>
)

const Casilla = ({ marcada }: { marcada: boolean }) => <span className={`cd-casilla${marcada ? ' si' : ''}`} aria-label={marcada ? 'Sí' : 'No'} />

const IconoMesa = () => (
  <svg viewBox="0 0 40 32" aria-hidden="true">
    <ellipse cx="20" cy="9" rx="17" ry="6" fill="#8a5a3b" />
    <rect x="17" y="12" width="6" height="14" fill="#6d452c" />
    <rect x="3" y="14" width="4" height="16" rx="1" fill="#6d452c" />
    <rect x="33" y="14" width="4" height="16" rx="1" fill="#6d452c" />
    <rect x="11" y="26" width="18" height="3" rx="1.5" fill="#6d452c" />
  </svg>
)

const fechaCorta = (f: string) => {
  const [a, m, d] = f.split('-')
  return { d, m, a }
}

const num = (n: number | undefined) => (n === undefined ? '' : n.toLocaleString('es-VE', { maximumFractionDigits: 2 }))

interface Props {
  jornada: Jornada
  comandas: Comanda[]
  resumen: ResumenDia
  inventarioFinal: Inventario | null
  observaciones: string
}

/**
 * Hoja "Control diario de caja" con el mismo diseño del formato en papel de
 * La Esquina, llena con las comandas del día. Se ve en pantalla y se imprime.
 */
export function ControlDiario({ jornada, comandas, resumen: r, inventarioFinal, observaciones }: Props) {
  const delDia = comandas.filter(c => c.fecha === jornada.fecha).sort((a, b) => a.numero - b.numero)
  const vacias = Math.max(0, FILAS_MINIMAS - delDia.length)
  const ultimo = delDia.at(-1)?.numero ?? 0
  const f = fechaCorta(jornada.fecha)
  const mitad = Math.ceil(INSUMOS.length / 2)
  const efectivoUsd = r.porMetodo.find(v => v.metodo === 'efectivo' && v.moneda === 'usd')

  const entregado = jornada.inventario ?? {}
  const vendido = usado(comandas, jornada.fecha)
  const queda = deberiaQuedar(entregado, vendido)

  const filaInsumo = (i: (typeof INSUMOS)[number]) => {
    const final = inventarioFinal?.[i.id]
    const dif = final !== undefined && queda[i.id] !== undefined ? final - queda[i.id]! : undefined
    return (
      <>
        <td>{i.nombre}</td>
        <td className="cd-num">{num(entregado[i.id])}</td>
        <td className={`cd-num${queda[i.id] !== undefined ? ' cd-auto' : ''}`}>{num(vendido[i.id])}</td>
        <td className={`cd-num${queda[i.id] !== undefined ? ' cd-auto' : ''}`}>{num(queda[i.id])}</td>
        <td className="cd-num">{num(final)}</td>
        <td className={`cd-num cd-dif${dif ? (dif < 0 ? ' falta' : ' sobra') : ''}`}>{dif === undefined ? '' : dif > 0 ? `+${num(dif)}` : num(dif)}</td>
      </>
    )
  }

  return (
    <article className="cd-hoja" aria-label="Control diario de caja">
      <header className="cd-banner">
        <div className="cd-logo">
          <span className="cd-marca">La Esquin<span className="cd-a">a</span></span>
          <span className="cd-trazo" />
          <span className="cd-sub">Perros calientes</span>
        </div>
        <div className="cd-lema">
          <span>No es <b>hambre,</b></span>
          <span>es <b>ansiedad.</b> <Corazon /></span>
        </div>
        <img className="cd-perro" src={perroBanner} alt="" />
        <div className="cd-derecha">
          <span className="cd-momento">Más que un perro,<br />es un buen momento <Corazon /></span>
          <span className="cd-sabores">Sabores<br />que unen<br />personas <Corazon /></span>
        </div>
      </header>

      <section className="cd-arriba">
        <div className="cd-fecha">
            <b>Fecha:</b>
            <span className="cd-linea">{f.d}</span>/<span className="cd-linea">{f.m}</span>/<span className="cd-linea">{f.a}</span>
            <span className="cd-tasa">Tasa BCV: Bs {fmtBs(jornada.tasa)}</span>
        </div>
        <div className="cd-caja cd-precios">
            <h3>Precios del día</h3>
            <div className="cd-precios-fila">
              <div><img src={perroBanner} alt="" /><small>Precio del perro caliente</small><span>Bs. <u>{fmtBs(jornada.precios.perro)}</u></span></div>
              {BEBIDAS.map(b => (
                <div key={b.id}><IconoBebida b={b} /><small>Precio del {b.nombre.toLowerCase().replace(/ l$/, ' L')}</small><span>Bs. <u>{fmtBs(jornada.precios.bebidas?.[b.id] ?? 0)}</u></span></div>
              ))}
              <div><IconoEnvase /><small>Envase para llevar</small><span>Bs. <u>{fmtBs(jornada.precios.envase ?? 0)}</u></span></div>
            </div>
        </div>
        <div className="cd-caja cd-inventario">
          <h3>Inventario entregado para el día</h3>
          <table>
            <thead><tr>{[0, 1].map(k => (
              <Fragment key={k}><th>Insumo</th><th>Entregado</th><th>Vendido</th><th>Debería quedar</th><th>Final</th><th>Diferencia</th></Fragment>
            ))}</tr></thead>
            <tbody>
              {INSUMOS.slice(0, mitad).map((i, k) => (
                <tr key={i.id}>{filaInsumo(i)}{INSUMOS[mitad + k] ? filaInsumo(INSUMOS[mitad + k]) : <><td /><td /><td /><td /><td /><td /></>}</tr>
              ))}
            </tbody>
          </table>
          <p className="cd-nota-inv">Vendido y Debería quedar los calcula la app con las comandas: 1 pan por perro, 1 salchicha por perro que la lleva y 1 unidad por bebida.</p>
        </div>
      </section>

      <div className="cd-titulo">
        <h2>Control diario de caja</h2>
        <span className="cd-mano">¡Buena comida,<br />mejores historias! <Corazon /></span>
      </div>

      <div className="cd-tabla-wrap">
        <table className="cd-tabla">
          <thead>
            <tr>
              <th rowSpan={2} className="cd-h-num">Nº<br />comanda</th>
              <th rowSpan={2} className="cd-h-nombre">Nombre del cliente</th>
              <th rowSpan={2} className="cd-h-perro">Perros calientes (cant)<img src={perroBanner} alt="" /></th>
              <th colSpan={BEBIDAS.length} className="cd-h-bebidas">Bebidas (cantidad)</th>
              <th rowSpan={2} className="cd-h-envase">Envase para llevar (cant)<IconoEnvase /></th>
              <th rowSpan={2} className="cd-h-total">Total a cobrar<b>Bs.</b></th>
              <th colSpan={METODOS.length} className="cd-h-pago">Forma de pago</th>
              <th rowSpan={2} className="cd-h-cobrado">Cobrado<b>✓</b></th>
              <th rowSpan={2} className="cd-h-mesa">Nº de mesa<IconoMesa /></th>
            </tr>
            <tr>
              {BEBIDAS.map(b => <th key={b.id} className="cd-h-bebidas cd-sub-h">{b.nombre}<IconoBebida b={b} /></th>)}
              {METODOS.map(m => <th key={m.id} className="cd-h-pago cd-sub-h">{m.nombre}{m.icono}</th>)}
            </tr>
          </thead>
          <tbody>
            {delDia.map(c => {
              const anulada = !!c.anuladaEn
              return (
                <tr key={c.id} className={anulada ? 'cd-anulada' : undefined}>
                  <td className="cd-num-com">{fmtNumero(c.numero).slice(1)}</td>
                  <td className="cd-nombre">{c.nombre}{anulada && <em> (anulada)</em>}</td>
                  <td className="cd-num">{totalPerros(c.perros) || ''}</td>
                  {BEBIDAS.map(b => <td key={b.id} className="cd-num">{c.bebidas[b.id] || ''}</td>)}
                  <td className="cd-num">{c.envases || ''}</td>
                  <td className="cd-num cd-total">{anulada ? '' : fmtBs(c.totalBs)}</td>
                  {METODOS.map(m => <td key={m.id} className="cd-check"><Casilla marcada={!anulada && c.pago?.metodo === m.id} /></td>)}
                  <td className="cd-check"><Casilla marcada={!anulada && !!c.pago && c.pago.metodo !== 'credito'} /></td>
                  <td className="cd-num">{c.mesa === 'LL' ? 'LL' : c.mesa}</td>
                </tr>
              )
            })}
            {Array.from({ length: vacias }, (_, k) => (
              <tr key={`v${k}`}>
                <td className="cd-num-com">{fmtNumero(ultimo + k + 1).slice(1)}</td>
                <td /><td />{BEBIDAS.map(b => <td key={b.id} />)}<td /><td />
                {METODOS.map(m => <td key={m.id} className="cd-check"><Casilla marcada={false} /></td>)}
                <td className="cd-check"><Casilla marcada={false} /></td><td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="cd-abajo">
        <div className="cd-caja cd-res-ventas">
          <h3>Resumen de ventas del día</h3>
          <ul>
            <li><img src={perroBanner} alt="" /><span>Total de perros calientes vendidos:</span><b>{r.perros}</b></li>
            {BEBIDAS.map(b => <li key={b.id}><IconoBebida b={b} /><span>Total de {PLURAL[b.id]} vendidos:</span><b>{r.bebidas[b.id] ?? 0}</b></li>)}
            <li><IconoEnvase /><span>Total de envases para llevar vendidos:</span><b>{r.envases}</b></li>
            <li className="sin-ic"><span>Total de comandas:</span><b>{r.comandasCobradas + r.pendientes}</b></li>
            <li className="sin-ic"><span>Comandas anuladas:</span><b>{r.anuladas}</b></li>
          </ul>
        </div>
        <div className="cd-caja cd-res-pago">
          <h3>Resumen por forma de pago</h3>
          <ul>
            {METODOS.map(m => (
              <li key={m.id}>
                <span>{m.id === 'transferencia' ? 'Transferencia' : m.nombre}:</span>
                <span className="cd-bs">Bs. <u>{fmtBs(totalMetodoBs(r, m.id))}</u></span>
              </li>
            ))}
          </ul>
          {efectivoUsd && <p className="cd-nota">El efectivo incluye ${fmtUsd(efectivoUsd.usd)} recibidos en divisas.</p>}
          <div className="cd-facturado">Total facturado: <span>Bs. <u>{fmtBs(r.totalBs)}</u></span></div>
          {r.pendientes > 0 && <p className="cd-nota cd-pend">Sin cobrar: {r.pendientes} comanda{r.pendientes > 1 ? 's' : ''} por Bs {fmtBs(r.pendientesBs)}</p>}
        </div>
        <div className="cd-caja cd-obs">
          <h3>Observaciones generales</h3>
          <p>{observaciones}</p>
        </div>
      </section>

      <footer className="cd-pie">
        <div className="cd-gracias">
          <svg viewBox="0 0 48 30" aria-hidden="true">
            <circle cx="24" cy="8" r="6" /><path d="M13 29c0-7 5-12 11-12s11 5 11 12z" />
            <circle cx="9" cy="11" r="4.5" /><path d="M1 29c0-6 3.5-10 8-10 2 0 3.5.6 5 1.8-2 2.4-3 5.3-3 8.2z" />
            <circle cx="39" cy="11" r="4.5" /><path d="M47 29c0-6-3.5-10-8-10-2 0-3.5.6-5 1.8 2 2.4 3 5.3 3 8.2z" />
          </svg>
          <span>Gracias por ser parte<br />de esta gran familia <Corazon /></span>
        </div>
        <div className="cd-pie-marca">
          <span className="cd-marca">La Esquina</span>
          <span className="cd-regresa">Un sabor<br />que siempre regresa <Corazon /></span>
        </div>
      </footer>
      <div className="cd-franjas"><span /><span /></div>
    </article>
  )
}
