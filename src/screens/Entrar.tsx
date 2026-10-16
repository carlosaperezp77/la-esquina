import { useState } from 'react'
import { almacen } from '../data'
import { validarNuevoUsuario } from '../domain/accesos'
import type { Usuario } from '../domain/tipos'

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Pantalla para entrar con usuario y clave. */
export function Entrar({ alEntrar }: { alEntrar: (u: Usuario) => void }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario.trim() || !clave) return setError('Escribe tu usuario y tu clave.')
    setEntrando(true)
    try {
      alEntrar(await almacen.entrar(usuario, clave))
    } catch (err) {
      setError(mensaje(err))
      setEntrando(false)
    }
  }

  return (
    <form className="wrap acceso" onSubmit={entrar} noValidate>
      <h1 className="titulo" style={{ fontSize: 28 }}>Entrar<small>Con el usuario y la clave que te dio el administrador.</small></h1>
      <section className="panel">
        <label className="lbl" htmlFor="usuario">Usuario</label>
        <input className="box" id="usuario" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={usuario} onChange={e => { setUsuario(e.target.value); setError('') }} />
        <label className="lbl" htmlFor="clave">Clave</label>
        <input className="box" id="clave" type="password" autoComplete="current-password"
          value={clave} onChange={e => { setClave(e.target.value); setError('') }} />
      </section>
      <div className="send">
        {error && <p className="msg err" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </div>
    </form>
  )
}

/** Primera vez: se crea el usuario administrador. */
export function CrearAdmin({ alTerminar }: { alTerminar: (u: Usuario) => void }) {
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validarNuevoUsuario({ nombre, usuario, clave })
    if (err) return setError(err)
    if (clave !== repetir) return setError('Las dos claves no coinciden.')
    setGuardando(true)
    try {
      await almacen.crearAdmin({ nombre, usuario, clave })
      alTerminar(await almacen.entrar(usuario, clave))
    } catch (err) {
      setError(mensaje(err))
      setGuardando(false)
    }
  }

  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void, tipo = 'text', auto = 'off') => (
    <>
      <label className="lbl" htmlFor={id}>{etiqueta}</label>
      <input className="box" id={id} type={tipo} autoComplete={auto} autoCapitalize={id === 'nombre' ? 'words' : 'none'}
        value={valor} onChange={e => { cambiar(e.target.value); setError('') }} />
    </>
  )

  return (
    <form className="wrap acceso" onSubmit={crear} noValidate>
      <h1 className="titulo" style={{ fontSize: 28 }}>
        Crear el administrador
        <small>Es el primer usuario de la app. Con él se crean los accesos de gerencia, caja, cocina y meseros.</small>
      </h1>
      <section className="panel">
        {campo('nombre', 'Nombre', nombre, setNombre, 'text', 'name')}
        {campo('usuario', 'Usuario', usuario, setUsuario, 'text', 'username')}
        <p className="note">Letras y números, sin espacios ni acentos. Ejemplo: carlos</p>
        {campo('clave', 'Clave', clave, setClave, 'password', 'new-password')}
        {campo('repetir', 'Repite la clave', repetir, setRepetir, 'password', 'new-password')}
      </section>
      <div className="send">
        {error && <p className="msg err" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear y entrar'}</button>
      </div>
    </form>
  )
}
