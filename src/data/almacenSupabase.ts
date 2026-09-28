import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { aDolares, hoy, redondear, totalBs } from '../domain/calculos'
import type { Cierre, Comanda, EstadoComanda, Jornada, MetodoPago, Moneda, NuevaComanda, Precios, ResumenDia } from '../domain/tipos'
import type { Almacen } from './almacen'

interface Fila {
  id: string
  numero: number
  fecha: string
  nombre: string
  mesa: string
  perros: Comanda['perros']
  bebidas: Comanda['bebidas']
  observaciones: string
  tasa: number
  total_bs: number | null
  total_usd: number
  estado: EstadoComanda
  creada_en: string
  lista_en: string | null
  entregada_en: string | null
  pago_metodo: MetodoPago | null
  pago_referencia: string | null
  pago_moneda: Moneda | null
  cobrada_en: string | null
}

const aComanda = (f: Fila): Comanda => ({
  id: f.id,
  numero: f.numero,
  fecha: f.fecha,
  nombre: f.nombre,
  mesa: f.mesa,
  perros: f.perros,
  bebidas: f.bebidas,
  observaciones: f.observaciones,
  tasa: Number(f.tasa),
  // Las comandas anteriores a la apertura en Bs solo guardaban el total en USD.
  totalBs: f.total_bs != null ? Number(f.total_bs) : redondear(Number(f.total_usd) * Number(f.tasa)),
  totalUsd: Number(f.total_usd),
  estado: f.estado,
  creadaEn: f.creada_en,
  listaEn: f.lista_en,
  entregadaEn: f.entregada_en,
  pago: f.pago_metodo && f.cobrada_en
    ? { metodo: f.pago_metodo, referencia: f.pago_referencia, moneda: f.pago_moneda, cobradaEn: f.cobrada_en }
    : null,
})

interface FilaJornada {
  fecha: string
  tasa: number
  precios: Precios
  abierta_en: string
}

const aJornada = (f: FilaJornada): Jornada => ({
  fecha: f.fecha,
  tasa: Number(f.tasa),
  precios: f.precios,
  abiertaEn: f.abierta_en,
})

interface FilaCierre {
  fecha: string
  cerrado_en: string
  fondo_bs: number
  fondo_usd: number
  contado_bs: number
  contado_usd: number
  observaciones: string
  resumen: ResumenDia
}

const aCierre = (f: FilaCierre): Cierre => ({
  fecha: f.fecha,
  cerradoEn: f.cerrado_en,
  fondoBs: Number(f.fondo_bs),
  fondoUsd: Number(f.fondo_usd),
  contadoBs: Number(f.contado_bs),
  contadoUsd: Number(f.contado_usd),
  observaciones: f.observaciones,
  resumen: f.resumen,
})

/** Modo en línea: todos los equipos comparten la base de datos y se avisan por Realtime. */
export class AlmacenSupabase implements Almacen {
  readonly modo = 'en-linea' as const
  private db: SupabaseClient

  constructor(url: string, clave: string) {
    this.db = createClient(url, clave)
  }

  async listar() {
    const { data, error } = await this.db
      .from('comandas')
      .select('*')
      .or(`fecha.eq.${hoy()},cobrada_en.is.null`)
      .order('creada_en')
    if (error) throw error
    return (data as Fila[]).map(aComanda)
  }

  async ultimaJornada() {
    const { data, error } = await this.db
      .from('jornadas')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? aJornada(data as FilaJornada) : null
  }

  async abrirJornada(j: Omit<Jornada, 'abiertaEn'>) {
    const { data, error } = await this.db
      .from('jornadas')
      .upsert({ fecha: j.fecha, tasa: j.tasa, precios: j.precios, abierta_en: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return aJornada(data as FilaJornada)
  }

  suscribir(cb: () => void) {
    const canal = this.db
      .channel('la-esquina')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => cb())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jornadas' }, () => cb())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres' }, () => cb())
      .subscribe()
    return () => { void this.db.removeChannel(canal) }
  }

  async crear(n: NuevaComanda, jornada: Jornada) {
    const bs = totalBs(n, jornada.precios)
    // El número del día lo asigna la base de datos (ver la migración).
    const { data, error } = await this.db
      .from('comandas')
      .insert({
        fecha: hoy(),
        nombre: n.nombre.trim(),
        mesa: n.mesa,
        perros: n.perros.filter(l => l.cant > 0),
        bebidas: Object.fromEntries(Object.entries(n.bebidas).filter(([, v]) => v)),
        observaciones: n.observaciones.trim(),
        tasa: jornada.tasa,
        total_bs: bs,
        total_usd: aDolares(bs, jornada.tasa),
      })
      .select()
      .single()
    if (error) throw error
    return aComanda(data as Fila)
  }

  async cambiarEstado(id: string, estado: EstadoComanda) {
    const ahora = new Date().toISOString()
    const cambios: Partial<Fila> = { estado }
    if (estado === 'lista') cambios.lista_en = ahora
    if (estado === 'entregada') cambios.entregada_en = ahora
    const { error } = await this.db.from('comandas').update(cambios).eq('id', id)
    if (error) throw error
  }

  async cobrar(id: string, metodo: MetodoPago, referencia: string | null, moneda: Moneda | null) {
    const { error } = await this.db
      .from('comandas')
      .update({ pago_metodo: metodo, pago_referencia: referencia, pago_moneda: moneda, cobrada_en: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async cierre(fecha: string) {
    const { data, error } = await this.db.from('cierres').select('*').eq('fecha', fecha).maybeSingle()
    if (error) throw error
    return data ? aCierre(data as FilaCierre) : null
  }

  async cerrarDia(c: Omit<Cierre, 'cerradoEn'>) {
    const { data, error } = await this.db
      .from('cierres')
      .insert({
        fecha: c.fecha,
        fondo_bs: c.fondoBs,
        fondo_usd: c.fondoUsd,
        contado_bs: c.contadoBs,
        contado_usd: c.contadoUsd,
        observaciones: c.observaciones,
        resumen: c.resumen,
      })
      .select()
      .single()
    if (error) throw error.code === '23505' ? new Error('Este día ya se cerró.') : error
    return aCierre(data as FilaCierre)
  }
}
