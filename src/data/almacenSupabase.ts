import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hoy, totalUsd } from '../domain/calculos'
import type { Comanda, EstadoComanda, MetodoPago, NuevaComanda } from '../domain/tipos'
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
  total_usd: number
  estado: EstadoComanda
  creada_en: string
  lista_en: string | null
  entregada_en: string | null
  pago_metodo: MetodoPago | null
  pago_referencia: string | null
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
  totalUsd: Number(f.total_usd),
  estado: f.estado,
  creadaEn: f.creada_en,
  listaEn: f.lista_en,
  entregadaEn: f.entregada_en,
  pago: f.pago_metodo && f.cobrada_en
    ? { metodo: f.pago_metodo, referencia: f.pago_referencia, cobradaEn: f.cobrada_en }
    : null,
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

  suscribir(cb: () => void) {
    const canal = this.db
      .channel('comandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => cb())
      .subscribe()
    return () => { void this.db.removeChannel(canal) }
  }

  async crear(n: NuevaComanda) {
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
        tasa: n.tasa,
        total_usd: totalUsd(n),
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

  async cobrar(id: string, metodo: MetodoPago, referencia: string | null) {
    const { error } = await this.db
      .from('comandas')
      .update({ pago_metodo: metodo, pago_referencia: referencia, cobrada_en: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
