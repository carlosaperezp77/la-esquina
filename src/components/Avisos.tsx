export function BotonActivarAvisos({ activar }: { activar: () => void }) {
  return (
    <div className="send" style={{ justifyContent: 'flex-start' }}>
      <button type="button" className="btn sm" onClick={activar}>Activar avisos</button>
      <span className="msg" style={{ color: 'var(--soft)' }}>Suena y vibra cuando llega una comanda nueva o un adicional.</span>
    </div>
  )
}
