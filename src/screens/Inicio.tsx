export function Inicio() {
  return (
    <div className="wrap">
      <h1 className="titulo" style={{ fontSize: 28 }}>¿Quién usa este equipo?</h1>
      <div className="roles">
        <a className="rol" href="#caja"><b>Caja</b><span>Toma pedidos y cobra cuando el cliente termina.</span></a>
        <a className="rol" href="#cocina"><b>Cocina</b><span>Ve las comandas en orden y las marca como listas.</span></a>
        <a className="rol" href="#mesero"><b>Mesero</b><span>Toma pedidos y recibe el aviso de lo que hay que servir.</span></a>
      </div>
      <p className="note">Este equipo recuerda la elección. Se puede cambiar arriba en cualquier momento.</p>
    </div>
  )
}
