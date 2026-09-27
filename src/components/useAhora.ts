import { useEffect, useState } from 'react'

export function useAhora(cadaMs = 15_000) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), cadaMs)
    return () => clearInterval(t)
  }, [cadaMs])
  return ahora
}
