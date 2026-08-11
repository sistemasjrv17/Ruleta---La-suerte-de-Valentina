import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'
import type { Buyer } from '../types'

const states = ['Chihuahua', 'Durango', 'Sinaloa', 'Sonora', 'Coahuila', 'CDMX', 'Otro']

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, calcTotal, createOrder, raffle, site, saving, error: storeError } = useStore()
  const [buyer, setBuyer] = useState<Buyer>({ fullName: '', phone: '', state: 'Chihuahua' })
  const [error, setError] = useState('')

  if (!cart.tickets.length) {
    return <Navigate to="/boletos" replace />
  }

  const total = calcTotal(cart.tickets.length)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (buyer.fullName.trim().length < 3) {
      setError('Escribe tu nombre completo.')
      return
    }
    if (buyer.phone.replace(/\D/g, '').length < 10) {
      setError('Ingresa un teléfono a 10 dígitos.')
      return
    }
    const order = await createOrder(buyer)
    if (!order) {
      setError(storeError || 'No se pudo crear la orden. Puede que un boleto ya no esté disponible.')
      return
    }
    navigate(`/orden/${order.id}`)
  }

  return (
    <div className="stack">
      <div>
        <span className="eyebrow">Checkout</span>
        <h1>Tus datos</h1>
        <p className="muted">Apartamos tus boletos por {raffle.reserveMinutes} minutos.</p>
      </div>

      <div className="grid-2">
        <form className="panel panel--pad form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              value={buyer.fullName}
              onChange={(e) => setBuyer((b) => ({ ...b, fullName: e.target.value }))}
              placeholder="Como aparecerá en el comprobante"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">WhatsApp / celular</label>
            <input
              id="phone"
              inputMode="tel"
              value={buyer.phone}
              onChange={(e) => setBuyer((b) => ({ ...b, phone: e.target.value }))}
              placeholder="10 dígitos"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="state">Estado</label>
            <select
              id="state"
              value={buyer.state}
              onChange={(e) => setBuyer((b) => ({ ...b, state: e.target.value }))}
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {(error || storeError) && <div className="alert">{error || storeError}</div>}
          <div className="alert">{site.paymentWarning}</div>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Apartando…' : 'Apartar y ver pago'}
          </button>
          <Link to="/boletos" className="btn btn--ghost">
            Regresar a boletos
          </Link>
        </form>

        <aside className="panel panel--pad stack">
          <h2>Resumen</h2>
          <p style={{ margin: 0 }}>
            <strong>{cart.tickets.length}</strong> boletos · <strong>${total} MXN</strong>
          </p>
          <div className="chip-row">
            {cart.tickets.map((n) => (
              <span className="chip" key={n} style={{ background: 'rgba(255,79,163,.12)', color: 'var(--ink)' }}>
                {formatTicket(n, raffle.digits)}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
