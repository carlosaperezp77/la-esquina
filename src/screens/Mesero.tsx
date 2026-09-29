import { useEffect, useRef, useState } from 'react'
import { BotonActivarAvisos } from '../components/Avisos'
import { FormularioComanda } from '../components/FormularioComanda'
import { useAvisosNuevas } from '../components/useAvisos'
import { almacen } from '../data'
import { fmtBs, fmtNumero, hora, hoy, quien, resumen, ultimoAdicional } from '../domain/calculos'
import type { Cierre, Comanda, Jornada } from '../domain/tipos'

interface Props { comandas: Comanda[]; ultimaJornada: Jornada | null; cierreHoy: Cierre | null }

export function Mesero({ comandas, ultimaJornada, cierreHoy }: Props) {
  const jornada = ultimaJornada?.fecha === hoy() ? ultimaJornada : null
  const [vista, setVista] = useState<'servir' | 'nueva' | 'abiertas'>('servir')
  const [aviso, setAviso] = useState<string | null>(null)
  const [agregando, setAgregando] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const avisos = useAvisosNuevas(comandas)
  const abiertas = comandas.filter(c => !c.pago && !c.anuladaEn && c.fecha === jornada?.fecha)
  const enAgregar = abiertas.find(c => c.id === agregando)
  const listas = comandas.filter(c => c.estado === 'lista' && !c.anuladaEn)
  const conocidas = useRef<Set<string> | null>(null)

  // Aviso cuando cocina marca una comanda como lista.
  useEffect(() => {
    const ids = new Set(listas.map(c => c.id))
    const nuevas = conocidas.current ? listas.filter(c => !conocidas.current!.has(c.id)) : []
    conocidas.current = ids
    if (!nuevas.length) return
    setAviso(`Lista para servir: Nº ${nuevas.map(c => fmtNumero(c.numero)).join(', ')}`)
    navigator.vibrate?.([200, 100, 200])
    const t = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(t)
  }, [listas])

  return (
    <div className="wrap">
      <div className="tabs">
        <button type="button" aria-pressed={vista === 'servir'} onClick={() => setVista('servir')}>
          Para servir{listas.length > 0 && <span className="badge">{listas.length}</span>}
        </button>
        <button type="button" aria-pressed={vista === 'nueva'} onClick={() => { setVista('nueva'); setAgregando(null) }}>Nueva comanda</button>
        <button type="button" aria-pressed={vista === 'abiertas'} onClick={() => { setVista('abiertas'); setHecho(null) }}>
          Agregar a una cuenta{abiertas.length > 0 && <span className="badge">{abiertas.length}</span>}
        </button>
      </div>
      {avisos.mostrarBoton && <BotonActivarAvisos activar={avisos.activar} />}

      {vista === 'abiertas' ? (
        cierreHoy || !jornada ? <p className="vacio">No hay caja abierta hoy.</p>
          : enAgregar ? (
            <FormularioComanda key={enAgregar.id} jornada={jornada} agregarA={enAgregar}
              alTerminar={m => { setAgregando(null); setHecho(m ?? null) }} />
          ) : (
            <section className="lista">
              {hecho && <p className="msg ok aviso-ok" role="status">{hecho}</p>}
              {abiertas.length === 0 && <p className="vacio">No hay cuentas sin cobrar.</p>}
              {abiertas.map(c => (
                <div className="tk" key={c.id}>
                  <div className="tk-top">
                    <span className="n">Nº {fmtNumero(c.numero)}</span>
                    <span>{quien(c)}<br /><span className="d">{resumen(c)}</span></span>
                    <span className="t">Bs {fmtBs(c.totalBs)}</span>
                  </div>
                  <div className="acts">
                    <button type="button" className="btn sm" onClick={() => { setAgregando(c.id); setHecho(null) }}>Agregar</button>
                  </div>
                </div>
              ))}
            </section>
          )
      ) : vista === 'nueva' ? (
        cierreHoy ? <p className="vacio">La caja de hoy ya se cerró. No se pueden tomar más pedidos.</p>
          : jornada ? <FormularioComanda jornada={jornada} />
          : <p className="vacio">La caja todavía no abrió el día. Cuando el cajero ponga la tasa y los precios, podrás tomar pedidos.</p>
      ) : (
        <section className="lista">
          {listas.length === 0 && <p className="vacio">No hay comandas listas. Te aviso cuando cocina termine una.</p>}
          {listas.map(c => <ParaServir key={c.id} c={c} />)}
        </section>
      )}

      {aviso && <div className="aviso" role="status">{aviso}</div>}
      {!aviso && avisos.aviso && <button type="button" className="aviso nueva" role="status" onClick={avisos.cerrarAviso}>{avisos.aviso}</button>}
    </div>
  )
}

function ParaServir({ c }: { c: Comanda }) {
  const [ocupado, setOcupado] = useState(false)
  const a = ultimoAdicional(c)
  return (
    <div className="tk">
      <div className="tk-top">
        <span className="n">Nº {fmtNumero(c.numero)}</span>
        <span>{quien(c)}<br /><span className="d">{a ? `Adicional: ${resumen(a)}` : resumen(c)} · lista {c.listaEn ? hora(c.listaEn) : ''}</span></span>
        <span />
      </div>
      <div className="acts">
        <button type="button" className="btn sm" disabled={ocupado}
          onClick={() => { setOcupado(true); almacen.cambiarEstado(c.id, 'entregada').finally(() => setOcupado(false)) }}>
          Entregada
        </button>
      </div>
    </div>
  )
}
