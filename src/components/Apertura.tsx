import { useState } from 'react'
import { almacen } from '../data'
import { aDolares, fmtBs, fmtUsd, hoy, leerNumero, validarJornada } from '../domain/calculos'
import { BEBIDAS } from '../domain/menu'
import type { BebidaId, Jornada, Precios } from '../domain/tipos'
import perro from '../assets/iconos/salchicha.png'

const texto = (n: number | undefined) => (n ? fmtBs(n) : '')

/**
 * Apertura del día: el cajero escribe la tasa BCV y los precios en Bs antes de
 * empezar. Se precarga con la última apertura para que solo cambie lo necesario.
 */
export function Apertura({ anterior, alTerminar }: { anterior: Jornada | null; alTerminar?: () => void }) {
  const esHoy = anterior?.fecha === hoy()
  const [tasa, setTasa] = useState(texto(anterior?.tasa))
  const [perroBs, setPerroBs] = useState(texto(anterior?.precios.perro))
  const [bebidas, setBebidas] = useState<Record<BebidaId, string>>(() =>
    Object.fromEntries(BEBIDAS.map(b => [b.id, texto(anterior?.precios.bebidas[b.id])])) as Record<BebidaId, string>)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const t = leerNumero(tasa)
  const precios: Precios = {
    perro: leerNumero(perroBs),
    bebidas: Object.fromEntries(BEBIDAS.map(b => [b.id, leerNumero(bebidas[b.id])])) as Record<BebidaId, number>,
  }
  const enDolares = (bs: number) => (t && bs ? `≈ $${fmtUsd(aDolares(bs, t))}` : '$ —')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validarJornada({ tasa: t, precios })
    if (err) return setError(err)
    setGuardando(true)
    try {
      await almacen.abrirJornada({ fecha: hoy(), tasa: t, precios })
      alTerminar?.()
    } catch (e) {
      setError(`No se pudo guardar: ${e instanceof Error ? e.message : String(e)}`)
      setGuardando(false)
    }
  }

  const fila = (id: string, nombre: string, icono: string, valor: string, cambiar: (v: string) => void) => (
    <div className="precio" key={id}>
      <div className="ic"><img src={icono} alt="" /></div>
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
        {esHoy ? 'Cambiar tasa o precios de hoy' : 'Apertura del día'}
        <small>{esHoy ? 'Las comandas ya enviadas conservan su precio.' : 'Antes de tomar pedidos, confirma la tasa y los precios.'}</small>
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
        <span className="lbl">Precios en bolívares</span>
        <div className="precios">
          {fila('perro', 'Perro caliente', perro, perroBs, setPerroBs)}
          {BEBIDAS.map(b => fila(b.id, b.nombre, b.icono, bebidas[b.id], v => setBebidas(x => ({ ...x, [b.id]: v }))))}
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
