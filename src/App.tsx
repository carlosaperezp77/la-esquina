import { useEffect, useState } from 'react'
import { Encabezado } from './components/Encabezado'
import { useComandas } from './data/useComandas'
import { fmtNumero, hoy } from './domain/calculos'
import { Caja } from './screens/Caja'
import { Cocina } from './screens/Cocina'
import { Inicio } from './screens/Inicio'
import { Mesero } from './screens/Mesero'

export type Rol = 'caja' | 'cocina' | 'mesero'
const ROLES: Rol[] = ['caja', 'cocina', 'mesero']
const CLAVE_ROL = 'la-esquina:rol'

function rolDeHash(): Rol | null {
  const h = location.hash.slice(1)
  return (ROLES as string[]).includes(h) ? (h as Rol) : null
}

function rolGuardado(): Rol | null {
  try {
    const r = localStorage.getItem(CLAVE_ROL)
    return (ROLES as string[]).includes(r ?? '') ? (r as Rol) : null
  } catch {
    return null
  }
}

export default function App() {
  const [rol, setRol] = useState<Rol | null>(() => rolDeHash() ?? rolGuardado())
  const { comandas, error } = useComandas()

  useEffect(() => {
    const alCambiar = () => setRol(rolDeHash())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  useEffect(() => {
    if (!rol) return
    if (location.hash !== `#${rol}`) history.replaceState(null, '', `#${rol}`)
    try { localStorage.setItem(CLAVE_ROL, rol) } catch { /* sin almacenamiento */ }
  }, [rol])

  const proximo = comandas.filter(c => c.fecha === hoy()).reduce((m, c) => Math.max(m, c.numero), 0) + 1

  return (
    <>
      <Encabezado rol={rol} numero={rol === 'caja' ? fmtNumero(proximo) : undefined} />
      <main>
        {error && <p className="wrap msg err" role="alert">No hay conexión con los datos: {error}</p>}
        {rol === 'caja' && <Caja comandas={comandas} />}
        {rol === 'cocina' && <Cocina comandas={comandas} />}
        {rol === 'mesero' && <Mesero comandas={comandas} />}
        {!rol && <Inicio />}
      </main>
    </>
  )
}
