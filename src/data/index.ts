import type { Almacen } from './almacen'
import { AlmacenLocal } from './almacenLocal'
import { AlmacenSupabase } from './almacenSupabase'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const almacen: Almacen = url && clave ? new AlmacenSupabase(url, clave) : new AlmacenLocal()
