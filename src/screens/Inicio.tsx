import type { Pantalla } from '../domain/accesos'
import type { Usuario } from '../domain/tipos'

const OPCIONES: Record<Pantalla, string> = {
  caja: 'Toma pedidos y cobra cuando el cliente termina.',
  cocina: 'Ve las comandas en orden y las marca como listas.',
  mesero: 'Toma pedidos y recibe el aviso de lo que hay que servir.',
  usuarios: 'Crea, cambia o quita los accesos de cada persona.',
}
const NOMBRES: Record<Pantalla, string> = { caja: 'Caja', cocina: 'Cocina', mesero: 'Mesero', usuarios: 'Usuarios' }

export function Inicio({ permitidas, usuario }: { permitidas: Pantalla[]; usuario: Usuario | null }) {
  return (
    <div className="wrap">
      <h1 className="titulo" style={{ fontSize: 28 }}>{usuario ? `Hola, ${usuario.nombre}. ¿Qué vas a usar?` : '¿Quién usa este equipo?'}</h1>
      <div className="roles">
        {permitidas.map(p => <a key={p} className="rol" href={`#${p}`}><b>{NOMBRES[p]}</b><span>{OPCIONES[p]}</span></a>)}
      </div>
      <p className="note">Este equipo recuerda la elección. Se puede cambiar arriba en cualquier momento.</p>
    </div>
  )
}
