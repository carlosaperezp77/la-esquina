import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { aDolares, hoy, redondear, sumarAdicional, totalBs } from '../domain/calculos'
import type { Cierre, Comanda, EstadoComanda, Jornada, MetodoPago, Moneda, NuevaComanda, Pedido, Precios, ResumenDia } from '../domain/tipos'
import type { Almacen } from './almacen'

interface Fila {
  id: string
  numero: number
  fecha: string
  nombre: string
  mesa: string
  perros: Comanda['perros']
  bebidas: Comanda['bebidas']
  envases: number | null
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
  anulada_en: string | null
  adicionales: Comanda['adicionales'] | null
}

const aComanda = (f: Fila): Comanda => ({
  id: f.id,
  numero: f.numero,
  fecha: f.fecha,
  nombre: f.nombre,
  mesa: f.mesa,
  perros: f.perros,
  bebidas: f.bebidas,
  envases: f.envases ?? 0,
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
  anuladaEn: f.anulada_en,
  adicionales: f.adicionales ?? [],
})

interface FilaJornada {
  fecha: string
  tasa: number
  precios: Precios
  inventario: Jornada['inventario'] | null
  abierta_en: string
}

const aJornada = (f: FilaJornada): Jornada => ({
  fecha: f.fecha,
  tasa: Number(f.tasa),
  precios: f.precios,
  inventario: f.inventario ?? {},
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
  inventario_final: Cierre['inventarioFinal'] | null
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
  inventarioFinal: f.inventario_final ?? {},
  resumen: f.resumen,
})

/** Modo en línea: todos los equipos comparten la base de datos y se avisan por Realtime. */
export class AlmacenSupabase implements Almacen {
  readonly modo = 'en-linea' as const
  private db: SupabaseClient
  private url: string

  constructor(url: string, clave: string) {
    this.url = url
    this.db = createClient(url, clave)
  }

  async listar() {
    const { data, error } = await this.db
      .from('comandas')
      .select('*')
      .or(`fecha.eq.${hoy()},and(cobrada_en.is.null,anulada_en.is.null)`)
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
      .upsert({ fecha: j.fecha, tasa: j.tasa, precios: j.precios, inventario: j.inventario, abierta_en: new Date().toISOString() })
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
        envases: n.envases,
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

  async agregar(id: string, extra: Pedido, jornada: Jornada) {
    const { data: fila, error: e1 } = await this.db.from('comandas').select('*').eq('id', id).single()
    if (e1) throw e1
    const c = aComanda(fila as Fila)
    if (c.pago || c.anuladaEn) throw new Error('Esa comanda ya se cobró o se anuló.')
    const n = sumarAdicional(c, extra, jornada.precios)
    // Solo si sigue sin cobrar: si alguien la cobró mientras tanto, no se toca.
    const { data, error } = await this.db
      .from('comandas')
      .update({
        perros: n.perros, bebidas: n.bebidas, envases: n.envases, total_bs: n.totalBs, total_usd: n.totalUsd,
        estado: n.estado, lista_en: null, entregada_en: null, adicionales: n.adicionales,
      })
      .eq('id', id)
      .is('cobrada_en', null)
      .is('anulada_en', null)
      .select()
    if (error) throw error
    if (!data?.length) throw new Error('Esa comanda ya se cobró o se anuló.')
    return aComanda(data[0] as Fila)
  }

  async anular(id: string) {
    const { error } = await this.db
      .from('comandas')
      .update({ anulada_en: new Date().toISOString() })
      .eq('id', id)
      .is('cobrada_en', null)
    if (error) throw error
  }

  async cobrar(id: string, metodo: MetodoPago, referencia: string | null, moneda: Moneda | null) {
    const { error } = await this.db
      .from('comandas')
      .update({ pago_metodo: metodo, pago_referencia: referencia, pago_moneda: moneda, cobrada_en: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async clavePush() {
    const r = await fetch(`${this.url}/functions/v1/avisar-comanda`)
    if (!r.ok) throw new Error('La función de avisos no está publicada en Supabase.')
    const { publica } = await r.json() as { publica: string }
    return publica
  }

  async guardarSuscripcion(s: PushSubscriptionJSON, rol: 'cocina' | 'mesero') {
    const { error } = await this.db.rpc('guardar_suscripcion', {
      p_endpoint: s.endpoint, p_p256dh: s.keys?.p256dh, p_auth: s.keys?.auth, p_rol: rol,
    })
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
        inventario_final: c.inventarioFinal,
        resumen: c.resumen,
      })
      .select()
      .single()
    if (error) throw error.code === '23505' ? new Error('Este día ya se cerró.') : error
    return aCierre(data as FilaCierre)
  }
}
