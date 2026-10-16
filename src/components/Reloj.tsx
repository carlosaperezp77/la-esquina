export function Fecha({ ahora }: { ahora: Date }) {
  return (
    <span className="box ro">
      {ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <rect x="2" y="3" width="14" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7h14M6 1v4M12 1v4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  )
}

export function Hora({ ahora }: { ahora: Date }) {
  return (
    <span className="box ro">
      {ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false })}
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 5v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  )
}
