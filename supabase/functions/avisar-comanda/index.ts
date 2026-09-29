// Función de Supabase (Edge Function) que manda los avisos de comanda nueva a
// los teléfonos de cocina y meseros, aunque estén bloqueados.
//
// - GET: devuelve la clave pública con que cada teléfono se suscribe.
// - POST { id, tipo }: la llama la base de datos (migración 0006) cuando entra
//   una comanda nueva o un adicional. Lee la comanda y avisa a todos.
//
// Se publica desde el panel de Supabase con "Verify JWT" desactivado: solo
// avisa de comandas que ya existen, así que no hace falta clave para llamarla.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Claves del servidor de avisos: se crean la primera vez y quedan guardadas. */
async function claves(): Promise<{ publica: string; privada: string }> {
  const { data } = await db.from('config_push').select('publica, privada').eq('id', 1).maybeSingle()
  if (data) return data
  const k = webpush.generateVAPIDKeys()
  await db.from('config_push').upsert({ id: 1, publica: k.publicKey, privada: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true })
  const { data: guardadas, error } = await db.from('config_push').select('publica, privada').eq('id', 1).single()
  if (error) throw error
  return guardadas
}

type Linea = { cant: number; ingredientes: string[] }
type Pedido = { perros: Linea[]; bebidas: Record<string, number>; envases: number }

const TOTAL_INGREDIENTES = 9
const BEBIDAS: Record<string, string> = {
  nestea: 'Nestea', refresco: 'Refresco', refresco1l: 'Refresco 1 L', refresco2l: 'Refresco 2 L', agua: 'Agua',
}

/** Igual que resumen() de la app: "3 perros (2 con todo), 1 Agua". */
function resumen(p: Pedido): string {
  const n = p.perros.reduce((s, l) => s + l.cant, 0)
  const conTodo = p.perros.filter(l => l.ingredientes.length >= TOTAL_INGREDIENTES).reduce((s, l) => s + l.cant, 0)
  let perros = ''
  if (n) {
    perros = `${n} perro${n > 1 ? 's' : ''}`
    if (conTodo === n) perros += ' con todo'
    else if (conTodo) perros += ` (${conTodo} con todo)`
  }
  const bebidas = Object.entries(p.bebidas ?? {}).filter(([, v]) => v).map(([b, v]) => `${v} ${BEBIDAS[b] ?? b}`)
  const envases = p.envases ? `${p.envases} envase${p.envases > 1 ? 's' : ''}` : ''
  return [perros, ...bebidas, envases].filter(Boolean).join(', ')
}

const quien = (c: { nombre: string; mesa: string }) =>
  [c.nombre, c.mesa === 'LL' ? 'Para llevar' : c.mesa ? `Mesa ${c.mesa}` : ''].filter(Boolean).join(' · ') || 'Sin nombre'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const k = await claves()
    if (req.method === 'GET') return json({ publica: k.publica })

    const { id, tipo } = await req.json()
    const { data: c, error } = await db.from('comandas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!c || c.cobrada_en || c.anulada_en) return json({ enviados: 0 })

    const numero = String(c.numero).padStart(4, '0')
    const adicional = tipo === 'adicional' ? (c.adicionales ?? []).at(-1) : null
    const aviso = {
      title: adicional ? `Adicional Nº ${numero}` : `Nueva comanda Nº ${numero}`,
      body: `${quien(c)}: ${resumen(adicional ?? { perros: c.perros, bebidas: c.bebidas, envases: c.envases ?? 0 })}`,
      tag: `comanda-${c.id}-${c.total_bs}`,
    }

    webpush.setVapidDetails('https://carlosaperezp77.github.io/la-esquina/', k.publica, k.privada)
    const { data: subs } = await db.from('suscripciones_push').select('endpoint, p256dh, auth')
    let enviados = 0
    await Promise.all((subs ?? []).map(async s => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 600, urgency: 'high' },
        )
        enviados++
      } catch (e) {
        // 404/410: el teléfono ya no existe o desactivó los avisos.
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('suscripciones_push').delete().eq('endpoint', s.endpoint)
        else console.error('aviso fallido', status, (e as Error).message)
      }
    }))
    return json({ enviados })
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
