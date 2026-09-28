import { useState } from 'react'
import { almacen } from '../data'
import { aDolares, fmtBs, fmtUsd, hoy, leerNumero, validarJornada } from '../domain/calculos'
import { BEBIDAS, INSUMOS } from '../domain/menu'
import type { BebidaId, InsumoId, Inventario, Jornada, Precios } from '../domain/tipos'
import perro from '../assets/iconos/salchicha.png'
import { IconoEnvase } from './Iconos'

const texto = (n: number | undefined) => (n ? fmtBs(n) : '')
const cantidad = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

/**
 * Apertura del día: el cajero escribe la tasa BCV, los precios en Bs y el
 * inventario que recibe antes de empezar. Los precios se precargan con la
 * última apertura para que solo cambie lo necesario.
 */
export function Apertura({ anterior, alTerminar }: { anterior: Jornada | null; alTerminar?: () => void }) {
  const esHoy = anterior?.fecha === hoy()
  const [tasa, setTasa] = useState(texto(anterior?.tasa))
  const [perroBs, setPerroBs] = useState(texto(anterior?.precios.perro))
  const [envaseBs, setEnvaseBs] = useState(texto(anterior?.precios.envase))
  const [bebidas, setBebidas] = useState<Record<BebidaId, string>>(() =>
    Object.fromEntries(BEBIDAS.map(b => [b.id, texto(anterior?.precios.bebidas?.[b.id])])) as Record<BebidaId, string>)
  // El inventario solo se precarga al corregir la apertura de hoy; cada día se cuenta de nuevo.
  const [inventario, setInventario] = useState<Record<InsumoId, string>>(() =>
    Object.fromEntries(INSUMOS.map(i => [i.id, esHoy ? cantidad(anterior?.inventario?.[i.id]) : ''])) as Record<InsumoId, string>)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const t = leerNumero(tasa)
  const precios: Precios = {
    perro: leerNumero(perroBs),
    bebidas: Object.fromEntries(BEBIDAS.map(b => [b.id, leerNumero(bebidas[b.id])])) as Record<BebidaId, number>,
    envase: leerNumero(envaseBs),
  }
  const enDolares = (bs: number) => (t && bs ? `≈ $${fmtUsd(aDolares(bs, t))}` : '$ —')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validarJornada({ tasa: t, precios })
    if (err) return setError(err)
    const falta = INSUMOS.find(i => inventario[i.id].trim() === '')
    if (falta) return setError(`Escribe cuánto recibiste de ${falta.nombre} (pon 0 si no hay).`)
    const inv: Inventario = Object.fromEntries(INSUMOS.map(i => [i.id, leerNumero(inventario[i.id])]))
    setGuardando(true)
    try {
      await almacen.abrirJornada({ fecha: hoy(), tasa: t, precios, inventario: inv })
      alTerminar?.()
    } catch (e) {
      setError(`No se pudo guardar: ${e instanceof Error ? e.message : String(e)}`)
      setGuardando(false)
    }
  }

  const fila = (id: string, nombre: string, icono: React.ReactNode, valor: string, cambiar: (v: string) => void) => (
    <div className="precio" key={id}>
      <div className="ic">{icono}</div>
      <label htmlFor={`precio-${id}`}>{nombre}</label>
      <div className="entrada">
        <span>Bs</span>
        <input className="box" id={`precio-${id}`} inputMode="decimal" placeholder="0,00" value={valor}
          onChange={e => { cambiar(e.target.value); setError('') }} />
      </div>
      <span className="usd">{enDolares(leerNumero(valor))}</span>
    </div>
  )

  return (
    <form className="wrap apertura" onSubmit={guardar} noValidate>
      <h1 className="titulo" style={{ fontSize: 28 }}>
        {esHoy ? 'Cambiar la apertura de hoy' : 'Apertura del día'}
        <small>{esHoy ? 'Las comandas ya enviadas conservan su precio.' : 'Antes de tomar pedidos, confirma la tasa, los precios y el inventario que recibes.'}</small>
      </h1>

      <section className="panel tasa">
        <label className="lbl" htmlFor="tasa-dia">Tasa BCV del día</label>
        <div className="entrada">
          <span>Bs</span>
          <input className="box" id="tasa-dia" inputMode="decimal" placeholder="0,00" value={tasa}
            onChange={e => { setTasa(e.target.value); setError('') }} />
          <span className="por">por $1</span>
        </div>
      </section>

      <section className="panel">
        <span className="lbl">Precios del día</span>
        <div className="precios">
          {fila('perro', 'Perro caliente', <img src={perro} alt="" />, perroBs, setPerroBs)}
          {BEBIDAS.map(b => fila(b.id, b.nombre, <><img src={b.icono} alt="" />{b.tam && <span className="tam">{b.tam}</span>}</>, bebidas[b.id], v => setBebidas(x => ({ ...x, [b.id]: v }))))}
          {fila('envase', 'Envase para llevar', <IconoEnvase />, envaseBs, setEnvaseBs)}
        </div>
      </section>

      <section className="panel">
        <span className="lbl">Inventario entregado para el día</span>
        <p className="nota">Lo que recibes al empezar el turno. Al cerrar la caja declaras lo que queda.</p>
        <div className="inventario">
          {INSUMOS.map(i => (
            <label className="insumo" key={i.id} htmlFor={`inv-${i.id}`}>
              <span>{i.nombre}</span>
              <input className="box" id={`inv-${i.id}`} inputMode="decimal" placeholder="0" value={inventario[i.id]}
                onChange={e => { setInventario(x => ({ ...x, [i.id]: e.target.value })); setError('') }} />
            </label>
          ))}
        </div>
      </section>

      <div className="send">
        <span className="msg err" role="status">{error}</span>
        {esHoy && alTerminar && <button type="button" className="btn ghost" onClick={alTerminar}>Cancelar</button>}
        <button type="submit" className="btn" disabled={guardando}>{esHoy ? 'Guardar cambios' : 'Empezar el día'}</button>
      </div>
    </form>
  )
}
