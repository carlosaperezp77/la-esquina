import { useState } from 'react'
import { Apertura } from '../components/Apertura'
import { FormularioComanda } from '../components/FormularioComanda'
import { PorCobrar, TarjetaComanda } from '../components/Cobro'
import { Reporte } from '../components/Reporte'
import { fmtBs, fmtUsd, hora, hoy } from '../domain/calculos'
import { deberiaQuedar, usado } from '../domain/inventario'
import { INSUMOS } from '../domain/menu'
import type { Cierre, Comanda, Jornada } from '../domain/tipos'

/** Desde cuántas unidades se avisa que queda poco. */
const POCAS_UNIDADES = 3

interface Props { comandas: Comanda[]; ultimaJornada: Jornada | null; cierreHoy: Cierre | null }

export function Caja({ comandas, ultimaJornada, cierreHoy }: Props) {
  const [editando, setEditando] = useState(false)
  const [vista, setVista] = useState<'comandas' | 'reporte'>('comandas')
  const jornada = ultimaJornada?.fecha === hoy() ? ultimaJornada : null

  if (!jornada || editando) {
    return <Apertura key={ultimaJornada?.abiertaEn ?? 'nueva'} anterior={ultimaJornada} alTerminar={() => setEditando(false)} />
  }

  const pestanas = (
    <div className="tabs no-print">
      <button type="button" aria-pressed={vista === 'comandas'} onClick={() => setVista('comandas')}>Comandas</button>
      <button type="button" aria-pressed={vista === 'reporte'} onClick={() => setVista('reporte')}>Reporte y cierre</button>
    </div>
  )

  if (cierreHoy) {
    return (
      <div className="wrap">
        <p className="vacio no-print">La caja de hoy ya se cerró. Mañana empieza con una nueva apertura del día.</p>
        <Reporte comandas={comandas} jornada={jornada} cierre={cierreHoy} />
      </div>
    )
  }

  if (vista === 'reporte') {
    return <div className="wrap">{pestanas}<Reporte comandas={comandas} jornada={jornada} cierre={null} /></div>
  }

  const vigentes = comandas.filter(c => !c.anuladaEn)
  const pendientes = vigentes.filter(c => !c.pago)
  const cobradas = vigentes.filter(c => c.pago && c.fecha === hoy()).reverse()
  const deudaBs = pendientes.reduce((s, c) => s + c.totalBs, 0)
  const deudaUsd = pendientes.reduce((s, c) => s + c.totalUsd, 0)

  return (
    <div className="wrap">
      {pestanas}
      <div className="tasa-dia">
        <span>Tasa BCV de hoy: <b>Bs {fmtBs(jornada.tasa)}</b> por $1 · abierta a las {hora(jornada.abiertaEn)}</span>
        <button type="button" onClick={() => setEditando(true)}>Cambiar tasa, precios o inventario</button>
      </div>
      <AvisoExistencias jornada={jornada} comandas={comandas} />
      {Object.keys(jornada.inventario ?? {}).length === 0 && (
        <div className="alerta aviso-inv">
          <span>Falta declarar el inventario entregado para hoy.</span>
          <button type="button" className="btn sm" onClick={() => setEditando(true)}>Declarar inventario</button>
        </div>
      )}

      <FormularioComanda jornada={jornada} />

      <section className="lista">
        <h2 className="titulo">
          Por cobrar
          <small>
            {pendientes.length
              ? `${pendientes.length} cuenta${pendientes.length > 1 ? 's' : ''} · Bs ${fmtBs(deudaBs)} ($${fmtUsd(deudaUsd)})`
              : 'Nada pendiente'}
          </small>
        </h2>
        {pendientes.map(c => <PorCobrar key={c.id} c={c} />)}
      </section>

      {cobradas.length > 0 && (
        <section className="lista">
          <h2 className="titulo">Cobradas y a crédito hoy</h2>
          {cobradas.map(c => <TarjetaComanda key={c.id} c={c} />)}
        </section>
      )}
    </div>
  )
}

/** Avisa cuando a un insumo que se descuenta solo le quedan pocas unidades. */
function AvisoExistencias({ jornada, comandas }: { jornada: Jornada; comandas: Comanda[] }) {
  const queda = deberiaQuedar(jornada.inventario ?? {}, usado(comandas, jornada.fecha))
  const pocos = INSUMOS.filter(i => queda[i.id] !== undefined && queda[i.id]! <= POCAS_UNIDADES && (jornada.inventario?.[i.id] ?? 0) > 0)
  if (pocos.length === 0) return null
  return (
    <p className="alerta">
      Quedan pocos: {pocos.map(i => `${i.nombre} (${Math.max(0, queda[i.id]!)})`).join(', ')}.
    </p>
  )
}
