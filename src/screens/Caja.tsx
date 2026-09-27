import { FormularioComanda } from '../components/FormularioComanda'
import { PorCobrar, TarjetaComanda } from '../components/Cobro'
import { fmtUsd, hoy } from '../domain/calculos'
import type { Comanda } from '../domain/tipos'

export function Caja({ comandas }: { comandas: Comanda[] }) {
  const pendientes = comandas.filter(c => !c.pago)
  const cobradas = comandas.filter(c => c.pago && c.fecha === hoy()).reverse()
  const deuda = pendientes.reduce((s, c) => s + c.totalUsd, 0)

  return (
    <div className="wrap">
      <FormularioComanda />

      <section className="lista">
        <h2 className="titulo">
          Por cobrar
          <small>{pendientes.length ? `${pendientes.length} cuenta${pendientes.length > 1 ? 's' : ''} · $${fmtUsd(deuda)}` : 'Nada pendiente'}</small>
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
