import { useEffect, useMemo, useState } from 'react'
import { Encabezado } from './components/Encabezado'
import { almacen } from './data'
import { useAcceso } from './data/useAcceso'
import { useComandas } from './data/useComandas'
import { pantallasDe, type Pantalla } from './domain/accesos'
import { fmtNumero, hoy } from './domain/calculos'
import type { Usuario } from './domain/tipos'
import { Caja } from './screens/Caja'
import { Cocina } from './screens/Cocina'
import { CrearAdmin, Entrar } from './screens/Entrar'
import { Inicio } from './screens/Inicio'
import { Mesero } from './screens/Mesero'
import { Usuarios } from './screens/Usuarios'

const CLAVE_PANTALLA = 'la-esquina:rol'

function pantallaDeHash(permitidas: Pantalla[]): Pantalla | null {
  const h = location.hash.slice(1)
  return (permitidas as string[]).includes(h) ? (h as Pantalla) : null
}

function pantallaGuardada(permitidas: Pantalla[]): Pantalla | null {
  try {
    const r = localStorage.getItem(CLAVE_PANTALLA)
    return (permitidas as string[]).includes(r ?? '') ? (r as Pantalla) : null
  } catch {
    return null
  }
}

export default function App() {
  const { acceso, revisar, entro } = useAcceso()

  if (acceso.estado === 'cargando') return <><Encabezado /><main><p className="wrap vacio">Cargando…</p></main></>
  if (acceso.estado === 'error') {
    return (
      <><Encabezado /><main><div className="wrap">
        <p className="msg err" role="alert">No hay conexión: {acceso.mensaje}</p>
        <button type="button" className="btn sm" onClick={() => void revisar()}>Reintentar</button>
      </div></main></>
    )
  }
  if (acceso.estado === 'sin-admin') return <><Encabezado /><main><CrearAdmin alTerminar={entro} /></main></>
  if (acceso.estado === 'fuera') return <><Encabezado /><main><Entrar alEntrar={entro} /></main></>

  const usuario = acceso.estado === 'dentro' ? acceso.usuario : null
  const salir = async () => {
    await almacen.salir()
    try { localStorage.removeItem(CLAVE_PANTALLA) } catch { /* sin almacenamiento */ }
    await revisar()
  }
  return <Trabajo key={usuario?.id ?? 'libre'} usuario={usuario} salir={usuario ? salir : undefined} />
}

/** La app ya con acceso: cada usuario solo ve las pantallas de su rol. */
function Trabajo({ usuario, salir }: { usuario: Usuario | null; salir?: () => void }) {
  const permitidas = useMemo(() => pantallasDe(usuario?.rol ?? null), [usuario?.rol])
  const unica = permitidas.length === 1 ? permitidas[0] : null
  const [pantalla, setPantalla] = useState<Pantalla | null>(() => unica ?? pantallaDeHash(permitidas) ?? pantallaGuardada(permitidas))
  const { comandas, ultimaJornada, cierreHoy, cargado, error } = useComandas()

  useEffect(() => {
    const alCambiar = () => {
      const p = unica ?? pantallaDeHash(permitidas)
      setPantalla(p)
      // Una pantalla que este rol no puede ver vuelve a la suya.
      if (p && location.hash !== `#${p}`) history.replaceState(null, '', `#${p}`)
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [unica, permitidas])

  useEffect(() => {
    if (!pantalla) return
    if (location.hash !== `#${pantalla}`) history.replaceState(null, '', `#${pantalla}`)
    try { localStorage.setItem(CLAVE_PANTALLA, pantalla) } catch { /* sin almacenamiento */ }
  }, [pantalla])

  const proximo = comandas.filter(c => c.fecha === hoy()).reduce((m, c) => Math.max(m, c.numero), 0) + 1

  return (
    <>
      <Encabezado pantalla={pantalla} permitidas={unica ? [] : permitidas} usuario={usuario} salir={salir}
        numero={pantalla === 'caja' && ultimaJornada?.fecha === hoy() && !cierreHoy ? fmtNumero(proximo) : undefined} />
      <main>
        {error && <p className="wrap msg err" role="alert">No hay conexión con los datos: {error}</p>}
        {pantalla === 'caja' && cargado && <Caja comandas={comandas} ultimaJornada={ultimaJornada} cierreHoy={cierreHoy} />}
        {pantalla === 'cocina' && <Cocina comandas={comandas} />}
        {pantalla === 'mesero' && <Mesero comandas={comandas} ultimaJornada={ultimaJornada} cierreHoy={cierreHoy} />}
        {pantalla === 'usuarios' && usuario && <Usuarios yo={usuario} />}
        {!pantalla && <Inicio permitidas={permitidas} usuario={usuario} />}
      </main>
    </>
  )
}
