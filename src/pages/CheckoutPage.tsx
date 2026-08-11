import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'
import type { Buyer } from '../types'

const states = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
]
const PREVIEW_COUNT = 24

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, calcTotal, createOrder, raffle, site, saving, error: storeError } = useStore()
  const [buyer, setBuyer] = useState<Buyer>({ fullName: '', phone: '', state: 'Nuevo León' })
  const [error, setError] = useState('')
  const [showAllTickets, setShowAllTickets] = useState(false)

  const tickets = useMemo(
    () => [...cart.tickets].sort((a, b) => a - b),
    [cart.tickets],
  )
  const total = calcTotal(cart.tickets.length)
  const visibleTickets = showAllTickets ? tickets : tickets.slice(0, PREVIEW_COUNT)
  const hiddenCount = Math.max(0, tickets.length - PREVIEW_COUNT)

  if (!cart.tickets.length) {
    return <Navigate to="/boletos" replace />
  }

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
    <div className="stack checkout">
      <div>
        <span className="eyebrow">Checkout</span>
        <h1>Tus datos</h1>
        <p className="muted">Apartamos tus boletos por {raffle.reserveMinutes} minutos.</p>
      </div>

      <div className="checkout__layout">
        <form className="panel panel--pad form checkout__form" onSubmit={onSubmit}>
          <h2 className="checkout__form-title">Registro</h2>

          <div className="field">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              autoComplete="name"
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
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

          <div className="checkout__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Apartando…' : 'Apartar y ver pago'}
            </button>
            <Link to="/boletos" className="btn btn--ghost">
              Regresar a boletos
            </Link>
          </div>
        </form>

        <aside className="panel panel--pad checkout__summary">
          <div className="checkout__summary-head">
            <h2>Resumen</h2>
            <p className="checkout__total">
              <strong>{tickets.length}</strong> boletos · <strong>${total} MXN</strong>
            </p>
          </div>

          <div className={`checkout__tickets ${showAllTickets ? 'is-expanded' : ''}`}>
            <div className="chip-row">
              {visibleTickets.map((n) => (
                <span className="chip chip--ticket" key={n}>
                  {formatTicket(n, raffle.digits)}
                </span>
              ))}
            </div>
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm checkout__toggle"
              onClick={() => setShowAllTickets((v) => !v)}
            >
              {showAllTickets ? 'Ver menos' : `Ver los ${tickets.length} boletos`}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
