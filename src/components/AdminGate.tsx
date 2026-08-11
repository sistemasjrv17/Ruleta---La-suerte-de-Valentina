import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim() || 'valentina2026'
const SESSION_KEY = 'lsdv_admin_ok'

export function AdminGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setUnlocked(true)
    }
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
      setError('')
      return
    }
    setError('PIN incorrecto')
    setPin('')
  }

  if (!unlocked) {
    return (
      <div className="stack" style={{ maxWidth: 420, marginInline: 'auto' }}>
        <div className="panel panel--pad form">
          <span className="eyebrow">Acceso privado</span>
          <h1>Panel</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Ingresa tu PIN para continuar.
          </p>
          <form className="form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="admin-pin">PIN</label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="alert">{error}</div>}
            <button type="submit" className="btn btn--primary">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
