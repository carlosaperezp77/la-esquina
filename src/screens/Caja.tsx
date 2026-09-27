import { useState } from 'react'
import { Apertura } from '../components/Apertura'
import { FormularioComanda } from '../components/FormularioComanda'
import { PorCobrar, TarjetaComanda } from '../components/Cobro'
import { fmtBs, fmtUsd, hora, hoy } from '../domain/calculos'
import type { Comanda, Jornada } from '../domain/tipos'

export function Caja({ comandas, ultimaJornada }: { comandas: Comanda[]; ultimaJornada: Jornada | null }) {
  const [editando, setEditando] = useState(false)
  const jornada = ultimaJornada?.fecha === hoy() ? ultimaJornada : null

  if (!jornada || editando) {
    return <Apertura key={ultimaJornada?.abiertaEn ?? 'nueva'} anterior={ultimaJornada} alTerminar={() => setEditando(false)} />
  }

  const pendientes = comandas.filter(c => !c.pago)
  const cobradas = comandas.filter(c => c.pago && c.fecha === hoy()).reverse()
  const deudaBs = pendientes.reduce((s, c) => s + c.totalBs, 0)
  const deudaUsd = pendientes.reduce((s, c) => s + c.totalUsd, 0)

  return (
    <div className="wrap">
      <div className="tasa-dia">
        <span>Tasa BCV de hoy: <b>Bs {fmtBs(jornada.tasa)}</b> por $1 · abierta a las {hora(jornada.abiertaEn)}</span>
        <button type="button" onClick={() => setEditando(true)}>Cambiar tasa o precios</button>
      </div>

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
          <h2 className="titulo">Cobradas hoy</h2>
          {cobradas.map(c => <TarjetaComanda key={c.id} c={c} />)}
        </section>
      )}
    </div>
  )
}
