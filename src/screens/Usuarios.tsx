import { useCallback, useEffect, useState } from 'react'
import { almacen } from '../data'
import { nombreRol, ROLES_USUARIO, validarNuevoUsuario } from '../domain/accesos'
import type { CambioUsuario, RolUsuario, Usuario } from '../domain/tipos'

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Solo para el administrador: crear, cambiar y quitar accesos. */
export function Usuarios({ yo }: { yo: Usuario }) {
  const [lista, setLista] = useState<Usuario[] | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(() => almacen.usuarios().then(setLista, e => setError(mensaje(e))), [])
  useEffect(() => {
    let vivo = true
    almacen.usuarios().then(l => { if (vivo) setLista(l) }, e => { if (vivo) setError(mensaje(e)) })
    return () => { vivo = false }
  }, [])

  const hecho = async (texto: string) => { setOk(texto); setError(''); await cargar() }

  return (
    <div className="wrap usuarios">
      <h1 className="titulo" style={{ fontSize: 28 }}>
        Usuarios
        <small>Cada persona entra con su usuario y su clave, y solo ve lo de su rol.</small>
      </h1>
      <NuevoUsuarioForm alCrear={u => hecho(`Listo: ${u} ya puede entrar.`)} />
      {ok && <p className="msg ok" role="status">{ok}</p>}
      {error && <p className="msg err" role="alert">{error}</p>}
      <section className="lista">
        <h2 className="titulo">Accesos<small>{lista ? `${lista.length} usuario${lista.length === 1 ? '' : 's'}` : 'Cargando…'}</small></h2>
        {lista?.map(u => (
          <FilaUsuario key={u.id} u={u} esYo={u.id === yo.id} alCambiar={hecho} alFallar={e => { setOk(''); setError(e) }} />
        ))}
      </section>
      <div className="panel roles-ayuda">
        <span className="lbl">Qué puede hacer cada rol</span>
        <ul>{ROLES_USUARIO.map(r => <li key={r.id}><b>{r.nombre}:</b> {r.detalle}</li>)}</ul>
      </div>
    </div>
  )
}

function SelectorRol({ id, valor, cambiar, disabled }: { id: string; valor: RolUsuario; cambiar: (r: RolUsuario) => void; disabled?: boolean }) {
  return (
    <select className="box" id={id} value={valor} disabled={disabled} onChange={e => cambiar(e.target.value as RolUsuario)}>
      {ROLES_USUARIO.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
    </select>
  )
}

function NuevoUsuarioForm({ alCrear }: { alCrear: (usuario: string) => void }) {
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [rol, setRol] = useState<RolUsuario>('mesero')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validarNuevoUsuario({ nombre, usuario, clave })
    if (err) return setError(err)
    setGuardando(true)
    try {
      await almacen.crearUsuario({ nombre, usuario, clave, rol })
      alCrear(usuario.trim().toLowerCase())
      setNombre(''); setUsuario(''); setClave(''); setError('')
    } catch (err) {
      setError(mensaje(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="panel nuevo-usuario" onSubmit={crear} noValidate>
      <span className="lbl">Nuevo usuario</span>
      <div className="campos">
        <label>Nombre<input className="box" id="nu-nombre" autoComplete="off" value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} /></label>
        <label>Usuario<input className="box" id="nu-usuario" autoComplete="off" autoCapitalize="none" spellCheck={false} value={usuario} onChange={e => { setUsuario(e.target.value); setError('') }} /></label>
        <label>Clave<input className="box" id="nu-clave" autoComplete="new-password" value={clave} onChange={e => { setClave(e.target.value); setError('') }} /></label>
        <label>Rol<SelectorRol id="nu-rol" valor={rol} cambiar={setRol} /></label>
      </div>
      <p className="note">Anota la clave y entrégasela a la persona: después no se puede ver, solo cambiar.</p>
      <div className="send">
        {error && <p className="msg err" role="alert">{error}</p>}
        <button className="btn sm" type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear usuario'}</button>
      </div>
    </form>
  )
}

function FilaUsuario({ u, esYo, alCambiar, alFallar }: {
  u: Usuario; esYo: boolean; alCambiar: (texto: string) => void; alFallar: (e: string) => void
}) {
  const [clave, setClave] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const cambiar = async (c: CambioUsuario, texto: string) => {
    setOcupado(true)
    try {
      await almacen.cambiarUsuario(u.id, c)
      setClave(null)
      alCambiar(texto)
    } catch (e) {
      alFallar(mensaje(e))
    } finally {
      setOcupado(false)
    }
  }

  const borrar = async () => {
    if (!confirm(`¿Borrar el usuario "${u.usuario}" (${u.nombre})? Ya no podrá entrar.`)) return
    setOcupado(true)
    try {
      await almacen.borrarUsuario(u.id)
      alCambiar(`Se borró el usuario ${u.usuario}.`)
    } catch (e) {
      alFallar(mensaje(e))
      setOcupado(false)
    }
  }

  return (
    <article className={`tk usuario${u.activo ? '' : ' done'}`} aria-label={`Usuario ${u.usuario}`}>
      <div className="tk-top">
        <span className="n">{u.nombre}</span>
        <span className="d">usuario: <b>{u.usuario}</b>{esYo && ' · eres tú'}</span>
        <span className={`chip ${u.activo ? 'info' : ''}`}>{u.activo ? nombreRol(u.rol) : 'Desactivado'}</span>
      </div>
      <div className="acts">
        <label className="rol-sel">Rol
          <SelectorRol id={`rol-${u.id}`} valor={u.rol} disabled={esYo || ocupado}
            cambiar={r => void cambiar({ rol: r }, `${u.nombre} ahora es ${nombreRol(r)}.`)} />
        </label>
        {clave === null
          ? <button type="button" className="btn ghost sm" disabled={ocupado} onClick={() => setClave('')}>Cambiar clave</button>
          : (
            <span className="ref">
              <input className="box" aria-label={`Nueva clave de ${u.usuario}`} autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} />
              <button type="button" className="btn sm" disabled={ocupado || clave.length < 6}
                onClick={() => void cambiar({ clave }, `Se cambió la clave de ${u.usuario}.`)}>Guardar</button>
              <button type="button" className="btn ghost sm" onClick={() => setClave(null)}>Cancelar</button>
            </span>
          )}
        {!esYo && (
          <>
            <button type="button" className="btn ghost sm" disabled={ocupado}
              onClick={() => void cambiar({ activo: !u.activo }, u.activo ? `${u.usuario} ya no puede entrar.` : `${u.usuario} puede entrar de nuevo.`)}>
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button type="button" className="btn ghost sm" disabled={ocupado} onClick={() => void borrar()}>Borrar</button>
          </>
        )}
      </div>
    </article>
  )
}
