import { useState } from 'react'
import { almacen } from '../data'
import { fmtBs, fmtNumero, fmtUsd, hora, leerNumero, redondear } from '../domain/calculos'
import { BEBIDAS, METODOS_PAGO } from '../domain/menu'
import { efectivoEsperado, resumenDia } from '../domain/reporte'
import type { Cierre, Comanda, Jornada, ResumenDia, VentaPorMetodo } from '../domain/tipos'

const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const nombreMetodo = (v: VentaPorMetodo) =>
  METODOS_PAGO.find(m => m.id === v.metodo)!.nombre + (v.metodo === 'efectivo' ? (v.moneda === 'usd' ? ' en $' : ' en Bs') : '')

const monto = (v: VentaPorMetodo) => (v.moneda === 'usd' ? `$${fmtUsd(v.monto)}` : `Bs ${fmtBs(v.monto)}`)

/** Reporte de ventas del día y cierre de caja. */
export function Reporte({ comandas, jornada, cierre }: { comandas: Comanda[]; jornada: Jornada; cierre: Cierre | null }) {
  const r = cierre?.resumen ?? resumenDia(comandas, jornada.fecha)
  const referencias = comandas
    .filter(c => c.fecha === jornada.fecha && c.pago?.referencia)
    .sort((a, b) => a.numero - b.numero)

  return (
    <div className="wrap reporte">
      <div className="rep-cab">
        <h1 className="titulo" style={{ fontSize: 28 }}>
          Ventas del día
          <small>{fechaLarga(jornada.fecha)} · Tasa BCV Bs {fmtBs(jornada.tasa)}</small>
        </h1>
        <button type="button" className="btn ghost sm no-print" onClick={() => window.print()}>Imprimir</button>
      </div>

      <div className="cifras">
        <div><span>Total vendido</span><b>Bs {fmtBs(r.totalBs)}</b><small>${fmtUsd(r.totalUsd)}</small></div>
        <div><span>Comandas cobradas</span><b>{r.comandasCobradas}</b><small>{r.perros} perro{r.perros === 1 ? '' : 's'}</small></div>
      </div>

      {!cierre && r.pendientes > 0 && (
        <p className="alerta">
          Hay {r.pendientes} comanda{r.pendientes > 1 ? 's' : ''} sin cobrar por Bs {fmtBs(r.pendientesBs)}. No entran en el reporte hasta que se cobren.
        </p>
      )}

      <section className="panel">
        <span className="lbl">Por forma de pago</span>
        {r.porMetodo.length === 0 ? <p className="vacio">Todavía no hay ventas cobradas hoy.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Forma de pago</th><th>Comandas</th><th>Monto</th><th>Equivale</th></tr></thead>
            <tbody>
              {r.porMetodo.map(v => (
                <tr key={`${v.metodo}${v.moneda}`}>
                  <td>{nombreMetodo(v)}</td>
                  <td>{v.cant}</td>
                  <td><b>{monto(v)}</b></td>
                  <td>{v.moneda === 'usd' ? `Bs ${fmtBs(v.bs)}` : `$${fmtUsd(v.usd)}`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td>{r.comandasCobradas}</td><td><b>Bs {fmtBs(r.totalBs)}</b></td><td>${fmtUsd(r.totalUsd)}</td></tr></tfoot>
          </table></div>
        )}
      </section>

      <section className="panel">
        <span className="lbl">Productos vendidos</span>
        <div className="tabla"><table>
          <tbody>
            <tr><td>Perros calientes</td><td><b>{r.perros}</b></td><td className="d">{r.perrosConTodo} con todo</td></tr>
            {BEBIDAS.map(b => <tr key={b.id}><td>{b.nombre}</td><td><b>{r.bebidas[b.id] ?? 0}</b></td><td /></tr>)}
          </tbody>
        </table></div>
      </section>

      {referencias.length > 0 && (
        <section className="panel">
          <span className="lbl">Referencias para verificar en el banco</span>
          <div className="tabla"><table>
            <thead><tr><th>Nº</th><th>Forma de pago</th><th>Referencia</th><th>Monto</th></tr></thead>
            <tbody>
              {referencias.map(c => (
                <tr key={c.id}>
                  <td>{fmtNumero(c.numero)}</td>
                  <td>{METODOS_PAGO.find(m => m.id === c.pago!.metodo)!.nombre}</td>
                  <td><b>{c.pago!.referencia}</b></td>
                  <td>Bs {fmtBs(c.totalBs)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}

      {cierre ? <ResultadoCierre cierre={cierre} /> : <FormularioCierre r={r} fecha={jornada.fecha} />}
    </div>
  )
}

function Diferencia({ contado, esperado, moneda }: { contado: number; esperado: number; moneda: 'bs' | 'usd' }) {
  const d = redondear(contado - esperado)
  const f = (n: number) => (moneda === 'usd' ? `$${fmtUsd(Math.abs(n))}` : `Bs ${fmtBs(Math.abs(n))}`)
  if (d === 0) return <span className="dif ok">Cuadra</span>
  return <span className={`dif ${d > 0 ? 'sobra' : 'falta'}`}>{d > 0 ? 'Sobra' : 'Falta'} {f(d)}</span>
}

function FormularioCierre({ r, fecha }: { r: ResumenDia; fecha: string }) {
  const [fondoBs, setFondoBs] = useState('')
  const [fondoUsd, setFondoUsd] = useState('')
  const [contadoBs, setContadoBs] = useState('')
  const [contadoUsd, setContadoUsd] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esperado = efectivoEsperado(r, leerNumero(fondoBs), leerNumero(fondoUsd))
  const contado = { bs: leerNumero(contadoBs), usd: leerNumero(contadoUsd) }
  const listo = contadoBs.trim() !== '' && contadoUsd.trim() !== ''

  const cerrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (r.pendientes > 0) return setError('Cobra o revisa las comandas pendientes antes de cerrar.')
    if (!listo) return setError('Escribe el efectivo contado en Bs y en $ (pon 0 si no hay).')
    if (!confirmar) return setConfirmar(true)
    setGuardando(true)
    try {
      await almacen.cerrarDia({
        fecha,
        fondoBs: leerNumero(fondoBs),
        fondoUsd: leerNumero(fondoUsd),
        contadoBs: contado.bs,
        contadoUsd: contado.usd,
        observaciones: observaciones.trim(),
        resumen: r,
      })
    } catch (err) {
      setError(`No se pudo cerrar: ${err instanceof Error ? err.message : String(err)}`)
      setGuardando(false)
      setConfirmar(false)
    }
  }

  const campo = (id: string, etiqueta: string, pre: string, valor: string, cambiar: (v: string) => void) => (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <span className="entrada"><i>{pre}</i>
        <input className="box" id={id} inputMode="decimal" placeholder="0" value={valor}
          onChange={e => { cambiar(e.target.value); setError(''); setConfirmar(false) }} />
      </span>
    </label>
  )

  return (
    <form className="panel cierre no-print" onSubmit={cerrar} noValidate>
      <span className="lbl">Cierre de caja</span>
      <p className="nota">Cuenta el efectivo que hay en la caja, incluido el fondo con que empezaste.</p>
      <div className="arqueo">
        <div className="col-arqueo">
          <h3>Bolívares</h3>
          {campo('fondo-bs', 'Fondo inicial', 'Bs', fondoBs, setFondoBs)}
          <div className="linea"><span>Ventas en efectivo</span><b>Bs {fmtBs(esperado.bs - leerNumero(fondoBs))}</b></div>
          <div className="linea"><span>Debería haber</span><b>Bs {fmtBs(esperado.bs)}</b></div>
          {campo('contado-bs', 'Efectivo contado', 'Bs', contadoBs, setContadoBs)}
          {contadoBs.trim() !== '' && <Diferencia contado={contado.bs} esperado={esperado.bs} moneda="bs" />}
        </div>
        <div className="col-arqueo">
          <h3>Dólares</h3>
          {campo('fondo-usd', 'Fondo inicial', '$', fondoUsd, setFondoUsd)}
          <div className="linea"><span>Ventas en efectivo</span><b>${fmtUsd(esperado.usd - leerNumero(fondoUsd))}</b></div>
          <div className="linea"><span>Debería haber</span><b>${fmtUsd(esperado.usd)}</b></div>
          {campo('contado-usd', 'Efectivo contado', '$', contadoUsd, setContadoUsd)}
          {contadoUsd.trim() !== '' && <Diferencia contado={contado.usd} esperado={esperado.usd} moneda="usd" />}
        </div>
      </div>
      <label className="lbl" htmlFor="obs-cierre" style={{ fontSize: 17 }}>Observaciones</label>
      <textarea className="box" id="obs-cierre" placeholder="Ej.: faltante por vuelto mal dado" value={observaciones}
        onChange={e => setObservaciones(e.target.value)} />
      <div className="send">
        <span className="msg err" role="status">
          {error || (confirmar ? 'Después de cerrar no se pueden tomar más pedidos hoy. Toca otra vez para confirmar.' : '')}
        </span>
        <button type="submit" className={`btn${confirmar ? ' peligro' : ''}`} disabled={guardando}>
          {confirmar ? 'Confirmar cierre' : 'Cerrar caja'}
        </button>
      </div>
    </form>
  )
}

function ResultadoCierre({ cierre }: { cierre: Cierre }) {
  const esperado = efectivoEsperado(cierre.resumen, cierre.fondoBs, cierre.fondoUsd)
  return (
    <section className="panel cierre">
      <span className="lbl">Caja cerrada a las {hora(cierre.cerradoEn)}</span>
      <div className="tabla"><table>
        <thead><tr><th>Efectivo</th><th>Fondo</th><th>Debería haber</th><th>Contado</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr>
            <td>Bolívares</td><td>Bs {fmtBs(cierre.fondoBs)}</td><td>Bs {fmtBs(esperado.bs)}</td><td><b>Bs {fmtBs(cierre.contadoBs)}</b></td>
            <td><Diferencia contado={cierre.contadoBs} esperado={esperado.bs} moneda="bs" /></td>
          </tr>
          <tr>
            <td>Dólares</td><td>${fmtUsd(cierre.fondoUsd)}</td><td>${fmtUsd(esperado.usd)}</td><td><b>${fmtUsd(cierre.contadoUsd)}</b></td>
            <td><Diferencia contado={cierre.contadoUsd} esperado={esperado.usd} moneda="usd" /></td>
          </tr>
        </tbody>
      </table></div>
      {cierre.observaciones && <p className="nota">Observaciones: {cierre.observaciones}</p>}
    </section>
  )
}
