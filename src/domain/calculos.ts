import { BEBIDAS, INGREDIENTES, PRECIO_PERRO_USD } from './menu'
import type { Comanda, LineaPerro, NuevaComanda } from './tipos'

export const esConTodo = (l: LineaPerro) =>
  INGREDIENTES.every(i => l.ingredientes.includes(i.id))

export const totalPerros = (perros: LineaPerro[]) =>
  perros.reduce((s, l) => s + (l.cant > 0 ? l.cant : 0), 0)

export function totalUsd(c: Pick<NuevaComanda, 'perros' | 'bebidas'>): number {
  const bebidas = BEBIDAS.reduce((s, b) => s + (c.bebidas[b.id] ?? 0) * b.precioUsd, 0)
  return redondear(totalPerros(c.perros) * PRECIO_PERRO_USD + bebidas)
}

export const redondear = (n: number) => Math.round(n * 100) / 100

export const aBolivares = (usd: number, tasa: number) => redondear(usd * tasa)

export const fmtUsd = (n: number) => n.toFixed(2)
export const fmtBs = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtNumero = (n: number) => String(n).padStart(4, '0')

export function nombreMesa(mesa: string): string {
  if (!mesa) return ''
  return mesa === 'LL' ? 'Para llevar' : `Mesa ${mesa}`
}

export const quien = (c: Pick<Comanda, 'nombre' | 'mesa'>) =>
  [c.nombre, nombreMesa(c.mesa)].filter(Boolean).join(' · ')

/** Resumen corto: "3 perros (2 con todo), 1 Agua". */
export function resumen(c: Pick<Comanda, 'perros' | 'bebidas'>): string {
  const n = totalPerros(c.perros)
  const conTodo = totalPerros(c.perros.filter(esConTodo))
  let perros = ''
  if (n) {
    perros = `${n} perro${n > 1 ? 's' : ''}`
    if (conTodo === n) perros += ' con todo'
    else if (conTodo) perros += ` (${conTodo} con todo)`
  }
  const bebidas = BEBIDAS.filter(b => c.bebidas[b.id]).map(b => `${c.bebidas[b.id]} ${b.nombre}`)
  return [perros, ...bebidas].filter(Boolean).join(', ')
}

/** Ingredientes que le faltan a una línea respecto a "con todo", para cocina. */
export const sinIngredientes = (l: LineaPerro) =>
  INGREDIENTES.filter(i => !l.ingredientes.includes(i.id)).map(i => i.nombre)

/** Devuelve un mensaje de error, o null si la comanda se puede enviar. */
export function validar(c: NuevaComanda): string | null {
  const bebidas = Object.values(c.bebidas).reduce((s, n) => s + (n ?? 0), 0)
  if (!totalPerros(c.perros) && !bebidas) return 'Agrega al menos un perro o una bebida.'
  if (c.perros.some(l => l.cant > 0 && l.ingredientes.length === 0))
    return 'Marca los ingredientes de cada perro.'
  if (!c.nombre.trim() && !c.mesa) return 'Escribe el nombre del cliente o elige la mesa.'
  if (!(c.tasa > 0)) return 'Escribe la tasa BCV del día.'
  return null
}

export const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false })
