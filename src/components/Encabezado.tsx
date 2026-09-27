import logo from '../assets/iconos/logo.png'
import lema from '../assets/iconos/tag.png'
import { almacen } from '../data'
import type { Rol } from '../App'

const ROLES: { id: Rol; nombre: string }[] = [
  { id: 'caja', nombre: 'Caja' },
  { id: 'cocina', nombre: 'Cocina' },
  { id: 'mesero', nombre: 'Mesero' },
]

export function Encabezado({ numero, rol }: { numero?: string; rol: Rol | null }) {
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
      <nav className="nav">
        <div className="nav-in">
          {ROLES.map(r => (
            <a key={r.id} href={`#${r.id}`} aria-current={rol === r.id ? 'page' : undefined}>{r.nombre}</a>
          ))}
          <span className="modo">
            {almacen.modo === 'demo' ? <>Modo <b>demo</b>: solo este equipo</> : <>En línea</>}
          </span>
        </div>
      </nav>
    </>
  )
}
