import { useState } from 'react'
import { almacen } from '../data'
import { fmtBs, fmtNumero, fmtUsd, hora, leerNumero, redondear } from '../domain/calculos'
import { INSUMOS, METODOS_PAGO } from '../domain/menu'
import { deberiaQuedar, usado } from '../domain/inventario'
import { efectivoEsperado, resumenDia } from '../domain/reporte'
import type { Cierre, Comanda, InsumoId, Inventario, Jornada, ResumenDia } from '../domain/tipos'
import { ControlDiario } from './ControlDiario'

const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Reporte del día con el formato "Control diario de caja" y el cierre de caja. */
export function Reporte({ comandas, jornada, cierre }: { comandas: Comanda[]; jornada: Jornada; cierre: Cierre | null }) {
  const r = cierre?.resumen ?? resumenDia(comandas, jornada.fecha)
  const referencias = comandas
    .filter(c => c.fecha === jornada.fecha && c.pago?.referencia && !c.anuladaEn)
    .sort((a, b) => a.numero - b.numero)

  return (
    <div className="wrap reporte">
      <div className="rep-cab no-print">
        <h1 className="titulo" style={{ fontSize: 28 }}>
          Control diario de caja
          <small>{fechaLarga(jornada.fecha)} · Tasa BCV Bs {fmtBs(jornada.tasa)}</small>
        </h1>
        <button type="button" className="btn ghost sm" onClick={() => window.print()}>Imprimir</button>
      </div>

      {!cierre && r.pendientes > 0 && (
        <p className="alerta no-print">
          Hay {r.pendientes} comanda{r.pendientes > 1 ? 's' : ''} sin cobrar por Bs {fmtBs(r.pendientesBs)}. Cóbralas antes de cerrar la caja.
        </p>
      )}

      <ControlDiario jornada={jornada} comandas={comandas} resumen={r}
        inventarioFinal={cierre?.inventarioFinal ?? null} observaciones={cierre?.observaciones ?? ''} />

      {referencias.length > 0 && (
        <section className="panel no-print">
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

      {cierre ? <ResultadoCierre cierre={cierre} /> : <FormularioCierre r={r} jornada={jornada} comandas={comandas} />}
    </div>
  )
}

function Diferencia({ contado, esperado, moneda }: { contado: number; esperado: number; moneda: 'bs' | 'usd' }) {
  const d = redondear(contado - esperado)
  const f = (n: number) => (moneda === 'usd' ? `$${fmtUsd(Math.abs(n))}` : `Bs ${fmtBs(Math.abs(n))}`)
  if (d === 0) return <span className="dif ok">Cuadra</span>
  return <span className={`dif ${d > 0 ? 'sobra' : 'falta'}`}>{d > 0 ? 'Sobra' : 'Falta'} {f(d)}</span>
}

function FormularioCierre({ r, jornada, comandas }: { r: ResumenDia; jornada: Jornada; comandas: Comanda[] }) {
  const queda = deberiaQuedar(jornada.inventario ?? {}, usado(comandas, jornada.fecha))
  const [inventario, setInventario] = useState<Record<InsumoId, string>>(() =>
    Object.fromEntries(INSUMOS.map(i => [i.id, ''])) as Record<InsumoId, string>)
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
    const falta = INSUMOS.find(i => inventario[i.id].trim() === '')
    if (falta) return setError(`Escribe cuánto queda de ${falta.nombre.toLowerCase()} (pon 0 si no queda).`)
    if (!confirmar) return setConfirmar(true)
    setGuardando(true)
    try {
      await almacen.cerrarDia({
        fecha: jornada.fecha,
        fondoBs: leerNumero(fondoBs),
        fondoUsd: leerNumero(fondoUsd),
        contadoBs: contado.bs,
        contadoUsd: contado.usd,
        observaciones: observaciones.trim(),
        inventarioFinal: Object.fromEntries(INSUMOS.map(i => [i.id, leerNumero(inventario[i.id])])) as Inventario,
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
      <span className="lbl" style={{ fontSize: 17 }}>Inventario final</span>
      <p className="nota">Cuenta lo que queda de cada insumo al terminar el turno.</p>
      <div className="inventario">
        {INSUMOS.map(i => (
          <label className="insumo" key={i.id} htmlFor={`fin-${i.id}`}>
            <span>{i.nombre}
              <small className="entregado">
                Entregado: {jornada.inventario?.[i.id] ?? 0}
                {queda[i.id] !== undefined && <> · Debería quedar: <b>{queda[i.id]}</b></>}
              </small>
              {queda[i.id] !== undefined && inventario[i.id].trim() !== '' && <DifInsumo contado={leerNumero(inventario[i.id])} esperado={queda[i.id]!} />}
            </span>
            <input className="box" id={`fin-${i.id}`} inputMode="decimal" placeholder="0" value={inventario[i.id]}
              onChange={e => { setInventario(x => ({ ...x, [i.id]: e.target.value })); setError(''); setConfirmar(false) }} />
          </label>
        ))}
      </div>
      <label className="lbl" htmlFor="obs-cierre" style={{ fontSize: 17 }}>Observaciones generales</label>
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

function DifInsumo({ contado, esperado }: { contado: number; esperado: number }) {
  const d = redondear(contado - esperado)
  if (d === 0) return <span className="dif ok">Cuadra</span>
  return <span className={`dif ${d > 0 ? 'sobra' : 'falta'}`}>{d > 0 ? `Sobran ${d}` : `Faltan ${-d}`}</span>
}

function ResultadoCierre({ cierre }: { cierre: Cierre }) {
  const esperado = efectivoEsperado(cierre.resumen, cierre.fondoBs, cierre.fondoUsd)
  return (
    <section className="panel cierre no-print">
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
