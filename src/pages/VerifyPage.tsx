import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'
import type { Order } from '../types'

function statusLabel(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending_payment: 'Pendiente de pago',
    proof_uploaded: 'En revisión',
    paid: 'Pagado',
    expired: 'Expirado',
    rejected: 'Rechazado',
  }
  return map[status]
}

export function VerifyPage() {
  const { findOrdersByPhone, raffle } = useStore()
  const [phone, setPhone] = useState('')
  const [results, setResults] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const orders = await findOrdersByPhone(phone)
      setResults(orders)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <span className="eyebrow">Consulta</span>
        <h1>Verificar boletos</h1>
        <p className="muted">Busca tu compra con el teléfono que usaste al apartar.</p>
      </div>

      <form className="panel panel--pad form" onSubmit={onSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="phone">Teléfono</label>
          <input
            id="phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 6141112233"
            required
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {results && (
        <div className="stack">
          {results.length === 0 ? (
            <div className="alert">No encontramos órdenes con ese teléfono.</div>
          ) : (
            results.map((order) => (
              <div className="panel panel--pad stack" key={order.id}>
                <div className="section__head" style={{ marginBottom: 0 }}>
                  <div>
                    <h2 style={{ marginBottom: 0 }}>{order.id}</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {order.buyer.fullName} · ${order.total} MXN
                    </p>
                  </div>
                  <span
                    className={`badge badge--${
                      order.status === 'paid'
                        ? 'paid'
                        : order.status === 'proof_uploaded'
                          ? 'proof'
                          : 'pending'
                    }`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="chip-row">
                  {order.tickets.map((n) => (
                    <span
                      className="chip"
                      key={n}
                      style={{ background: 'rgba(255,79,163,.12)', color: 'var(--ink)' }}
                    >
                      {formatTicket(n, raffle.digits)}
                    </span>
                  ))}
                </div>
                <Link
                  className="btn btn--ghost btn--sm"
                  to={`/orden/${order.id}`}
                  style={{ justifySelf: 'start' }}
                >
                  Ver orden / pagar
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
