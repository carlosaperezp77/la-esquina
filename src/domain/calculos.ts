import { BEBIDAS, INGREDIENTES } from './menu'
import type { Comanda, Jornada, LineaPerro, NuevaComanda, Precios } from './tipos'

export const esConTodo = (l: LineaPerro) =>
  INGREDIENTES.every(i => l.ingredientes.includes(i.id))

export const totalPerros = (perros: LineaPerro[]) =>
  perros.reduce((s, l) => s + (l.cant > 0 ? l.cant : 0), 0)

export const redondear = (n: number) => Math.round(n * 100) / 100

/** Total de la comanda en bolívares con los precios del día. */
export function totalBs(c: Pick<NuevaComanda, 'perros' | 'bebidas'>, precios: Precios): number {
  const bebidas = BEBIDAS.reduce((s, b) => s + (c.bebidas[b.id] ?? 0) * (precios.bebidas[b.id] ?? 0), 0)
  return redondear(totalPerros(c.perros) * precios.perro + bebidas)
}

export const aDolares = (bs: number, tasa: number) => (tasa > 0 ? redondear(bs / tasa) : 0)

export const fmtUsd = (n: number) => n.toFixed(2)
export const fmtBs = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtNumero = (n: number) => String(n).padStart(4, '0')

/**
 * Lee un número escrito como se acostumbra en Venezuela o con punto decimal:
 * "1.250,50", "1250,5", "190.50" y "1.250" (miles) son válidos.
 */
export function leerNumero(texto: string): number {
  let t = texto.trim().replace(/\s|Bs\.?|\$/gi, '')
  if (!t) return 0
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : 0
}

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
  return null
}

/** Devuelve un mensaje de error, o null si la apertura está completa. */
export function validarJornada(j: Pick<Jornada, 'tasa' | 'precios'>): string | null {
  if (!(j.tasa > 0)) return 'Escribe la tasa BCV del día.'
  if (!(j.precios.perro > 0)) return 'Escribe el precio del perro en bolívares.'
  const falta = BEBIDAS.find(b => !(j.precios.bebidas[b.id] > 0))
  if (falta) return `Escribe el precio de ${falta.nombre} en bolívares.`
  return null
}

export const hoy = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false })
