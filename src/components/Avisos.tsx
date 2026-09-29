export function BotonActivarAvisos({ activar, nota }: { activar: () => void; nota?: string | null }) {
  return (
    <div className="send" style={{ justifyContent: 'flex-start' }}>
      <button type="button" className="btn sm" onClick={activar}>Activar avisos</button>
      <span className="msg" style={{ color: nota ? 'var(--mustard)' : 'var(--soft)' }}>
        {nota ?? 'Suena y vibra cuando llega una comanda nueva o un adicional, también con el teléfono bloqueado.'}
      </span>
    </div>
  )
}
