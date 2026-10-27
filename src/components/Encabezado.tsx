import logo from '../assets/iconos/logo.png'
import lema from '../assets/iconos/tag.png'
import { almacen } from '../data'
import { nombreRol, type Pantalla } from '../domain/accesos'
import type { Usuario } from '../domain/tipos'

const NOMBRES: Record<Pantalla, string> = { caja: 'Caja', cocina: 'Cocina', mesero: 'Mesero', usuarios: 'Usuarios' }

export function Encabezado({ numero, pantalla = null, permitidas = [], usuario = null, salir }: {
  numero?: string
  pantalla?: Pantalla | null
  permitidas?: Pantalla[]
  usuario?: Usuario | null
  salir?: () => void
}) {
  return (
    <>
      <header className="top">
        <div className="top-in">
          <img className="logo" src={logo} alt="La Esquina, perros calientes" />
          <img className="tagl" src={lema} alt="Más que perro, un buen momento" />
          {numero && (
            <div className="num" aria-label="Número de la próxima comanda">
              <b>Nº</b><span>{numero}</span>
            </div>
          )}
        </div>
      </header>
      <nav className="nav no-print">
        <div className="nav-in">
          {permitidas.map(p => (
            <a key={p} href={`#${p}`} aria-current={pantalla === p ? 'page' : undefined}>{NOMBRES[p]}</a>
          ))}
          {usuario
            ? (
              <span className="modo quien">
                <span><b>{usuario.nombre}</b> · {nombreRol(usuario.rol)}</span>
                {salir && <button type="button" onClick={salir}>Salir</button>}
              </span>
            )
            : (
              <span className="modo">
                {almacen.modo === 'demo' ? <>Modo <b>demo</b>: solo este equipo</> : <>En línea</>}
              </span>
            )}
        </div>
      </nav>
    </>
  )
}
