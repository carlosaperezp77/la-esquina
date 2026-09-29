import { useState } from 'react'
import { almacen } from '../data'
import { aDolares, esConTodo, fmtBs, fmtNumero, fmtUsd, quien, totalBs, validar } from '../domain/calculos'
import { BEBIDAS, INGREDIENTES, MESAS } from '../domain/menu'
import type { BebidaId, Comanda, IngredienteId, Jornada, LineaPerro } from '../domain/tipos'
import { IconoEnvase } from './Iconos'
import { Fecha, Hora } from './Reloj'
import { useAhora } from './useAhora'

const FILAS_INICIALES = 4

const filasVacias = () => Array.from({ length: FILAS_INICIALES }, (): LineaPerro => ({ cant: 0, ingredientes: [] }))

interface Props {
  jornada: Jornada
  /** Si viene, el pedido se suma a esta comanda sin cobrar en vez de crear una nueva. */
  agregarA?: Comanda
  /** Se llama al agregar con éxito (con el mensaje para mostrar) o al cancelar (sin mensaje). */
  alTerminar?: (mensaje?: string) => void
}

/** Toma de pedido con el diseño del prototipo. La usan caja y meseros, también para adicionales. */
export function FormularioComanda({ jornada, agregarA, alTerminar }: Props) {
  const ahora = useAhora()
  const [nombre, setNombre] = useState('')
  const [mesa, setMesa] = useState('')
  const [perros, setPerros] = useState<LineaPerro[]>(filasVacias)
  const [bebidas, setBebidas] = useState<Partial<Record<BebidaId, number>>>({})
  const [envases, setEnvases] = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const bs = totalBs({ perros, bebidas, envases }, jornada.precios)
  const usd = aDolares(bs, jornada.tasa)

  const cambiarFila = (i: number, f: (l: LineaPerro) => LineaPerro) =>
    setPerros(ps => ps.map((l, j) => (j === i ? f(l) : l)))

  const conCantidad = (l: LineaPerro): LineaPerro => (l.cant ? l : { ...l, cant: 1 })

  const alternarIngrediente = (i: number, id: IngredienteId) =>
    cambiarFila(i, l => l.ingredientes.includes(id)
      ? { ...l, ingredientes: l.ingredientes.filter(x => x !== id) }
      : conCantidad({ ...l, ingredientes: [...l.ingredientes, id] }))

  const alternarTodo = (i: number) =>
    cambiarFila(i, l => esConTodo(l)
      ? { ...l, ingredientes: [] }
      : conCantidad({ ...l, ingredientes: INGREDIENTES.map(x => x.id) }))

  const cambiarBebida = (id: BebidaId, delta: number) =>
    setBebidas(b => ({ ...b, [id]: Math.max(0, (b[id] ?? 0) + delta) }))

  const limpiar = () => {
    setNombre(''); setMesa(''); setPerros(filasVacias()); setBebidas({}); setEnvases(0); setObservaciones('')
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const pedido = { perros, bebidas, envases, observaciones }
    const nueva = agregarA ? { ...pedido, nombre: agregarA.nombre, mesa: agregarA.mesa } : { ...pedido, nombre, mesa }
    const error = validar(nueva)
    if (error) return setMensaje({ texto: error, ok: false })
    setEnviando(true)
    try {
      if (agregarA) {
        const c = await almacen.agregar(agregarA.id, pedido, jornada)
        limpiar()
        alTerminar?.(`Adicional agregado a la comanda Nº ${fmtNumero(c.numero)} y enviado a cocina. Ahora debe Bs ${fmtBs(c.totalBs)}.`)
        return
      }
      const c = await almacen.crear(nueva, jornada)
      setMensaje({ texto: `Comanda Nº ${fmtNumero(c.numero)} enviada a cocina. Queda por cobrar.`, ok: true })
      limpiar()
    } catch (err) {
      setMensaje({ texto: `No se pudo enviar: ${err instanceof Error ? err.message : String(err)}. Revisa la conexión e intenta de nuevo.`, ok: false })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className={`wrap${agregarA ? ' agregando' : ''}`} onSubmit={enviar} noValidate style={{ width: '100%' }}>
      {agregarA ? (
        <div className="meta-adicional">
          <span className="lbl">Adicional para Nº {fmtNumero(agregarA.numero)}</span>
          <span className="quien">{quien(agregarA)} · debe Bs {fmtBs(agregarA.totalBs)}</span>
          <button type="button" className="btn ghost sm" onClick={() => alTerminar?.()}>Cancelar</button>
        </div>
      ) : (
      <div className="meta">
        <label className="field grow">
          <span className="lbl">Nombre:</span>
          <input className="box" id="nombre" autoComplete="off" value={nombre} onChange={e => setNombre(e.target.value)} />
        </label>
        <label className="field">
          <span className="lbl">Mesa:</span>
          <select className="box" id="mesa" value={mesa} onChange={e => setMesa(e.target.value)}>
            <option value="">—</option>
            {MESAS.map(m => <option key={m} value={m}>{m}</option>)}
            <option value="LL">Para llevar</option>
          </select>
        </label>
        <div className="field"><span className="lbl">Fecha:</span><Fecha ahora={ahora} /></div>
        <div className="field"><span className="lbl">Hora:</span><Hora ahora={ahora} /></div>
      </div>
      )}

      <div className="gridwrap">
        <div className="grid">
          <div className="col cant">
            <h4>CANT.</h4><div className="ic" />
            {perros.map((l, i) => (
              <input key={i} type="number" min={0} max={20} className="qty" id={`cant${i}`}
                aria-label={`Cantidad fila ${i + 1}`} value={l.cant || ''}
                onChange={e => cambiarFila(i, x => ({ ...x, cant: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) }))} />
            ))}
          </div>
          <div className="col todo">
            <h4>Con<br />todo</h4><div className="ic txt">TODO</div>
            {perros.map((l, i) => (
              <button key={i} type="button" className="sq" aria-pressed={esConTodo(l)}
                aria-label={`Con todo fila ${i + 1}`} onClick={() => alternarTodo(i)} />
            ))}
          </div>
          {INGREDIENTES.map(ing => (
            <div className="col" key={ing.id}>
              <h4>{ing.nombre.split(' ').reduce<React.ReactNode[]>((a, w, k) => k ? [...a, <br key={k} />, w] : [w], [])}</h4>
              <div className="ic"><img src={ing.icono} alt="" /></div>
              {perros.map((l, i) => (
                <button key={i} type="button" className="sq" aria-pressed={l.ingredientes.includes(ing.id)}
                  aria-label={`${ing.nombre} fila ${i + 1}`} onClick={() => alternarIngrediente(i, ing.id)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {perros.length < 10 && (
        <button type="button" className="addrow" onClick={() => setPerros(ps => [...ps, { cant: 0, ingredientes: [] }])}>
          + Agregar perro
        </button>
      )}

      <div className="bottom">
        <section className="panel">
          <span className="lbl">Bebidas</span>
          <div className="opts">
            {BEBIDAS.map(b => {
              const n = bebidas[b.id] ?? 0
              return (
                <div className="opt" key={b.id}>
                  <button type="button" className="big" aria-label={`Agregar ${b.nombre}`} onClick={() => cambiarBebida(b.id, 1)}>
                    <img src={b.icono} alt="" className={b.foto ? 'foto' : undefined} />
                    {b.tam && <span className="tam">{b.tam}</span>}
                  </button>
                  <div className="stepper">
                    <button type="button" className="mini" aria-label={`Quitar ${b.nombre}`} hidden={!n} onClick={() => cambiarBebida(b.id, -1)}>−</button>
                    <span className={`bqty${n ? ' on' : ''}`}>{n || ''}</span>
                  </div>
                </div>
              )
            })}
            <div className="opt">
              <button type="button" className="big" aria-label="Agregar envase para llevar" onClick={() => setEnvases(n => n + 1)}>
                <IconoEnvase />
              </button>
              <div className="stepper">
                <button type="button" className="mini" aria-label="Quitar envase" hidden={!envases} onClick={() => setEnvases(n => Math.max(0, n - 1))}>−</button>
                <span className={`bqty${envases ? ' on' : ''}`}>{envases || ''}</span>
              </div>
            </div>
          </div>
          <small className="nota-envase">{BEBIDAS.map(b => b.nombre).join(' · ')} · Envase para llevar</small>
        </section>
        <section className="panel">
          <label className="lbl" htmlFor="obs" style={{ fontSize: 19 }}>Observaciones:</label>
          <textarea className="box" id="obs" placeholder="Ej.: sin picante, perro 2 bien tostado"
            value={observaciones} onChange={e => setObservaciones(e.target.value)} />
        </section>
        <section className="panel monto">
          <span className="lbl">{agregarA ? 'Adicional: Bs' : 'Monto: Bs'}</span>
          <span className="box val">{fmtBs(bs)}</span>
          <div className="bs">
            <span>$ <strong>{fmtUsd(usd)}</strong></span>
            <span>Tasa BCV {fmtBs(jornada.tasa)}</span>
          </div>
          {agregarA && <div className="bs"><span>Cuenta total: <strong>Bs {fmtBs(agregarA.totalBs + bs)}</strong></span></div>}
        </section>
      </div>

      <div className="send">
        <span className={`msg ${mensaje?.ok ? 'ok' : 'err'}`} role="status">{mensaje?.texto}</span>
        <button type="button" className="btn ghost" onClick={() => { limpiar(); setMensaje(null) }}>Limpiar</button>
        <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Enviando…' : agregarA ? 'Agregar y enviar a cocina' : 'Enviar a cocina'}</button>
      </div>
    </form>
  )
}
