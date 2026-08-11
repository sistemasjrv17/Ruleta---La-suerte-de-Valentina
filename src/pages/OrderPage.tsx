import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'
import type { PaymentMethodType } from '../types'

function statusLabel(status: string) {
  switch (status) {
    case 'pending_payment':
      return 'Pendiente de pago'
    case 'proof_uploaded':
      return 'Comprobante subido'
    case 'paid':
      return 'Pagado'
    case 'expired':
      return 'Expirado'
    case 'rejected':
      return 'Rechazado'
    default:
      return status
  }
}

function badgeClass(status: string) {
  if (status === 'pending_payment') return 'badge badge--pending'
  if (status === 'proof_uploaded') return 'badge badge--proof'
  if (status === 'paid') return 'badge badge--paid'
  return 'badge badge--expired'
}

export function OrderPage() {
  const { orderId } = useParams()
  const { orders, accounts, attachPayment, site, saving, raffle } = useStore()
  const order = orders.find((o) => o.id === orderId)
  const [fileName, setFileName] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const method: PaymentMethodType = 'mercadopago'

  const remainingMs = useMemo(() => {
    if (!order) return 0
    return Math.max(0, new Date(order.expiresAt).getTime() - Date.now())
  }, [order])

  if (!order) {
    return (
      <div className="panel panel--pad stack">
        <h1>Orden no encontrada</h1>
        <p className="muted">Si acabas de apartar, espera un momento o verifica con tu teléfono.</p>
        <Link className="btn btn--primary" to="/verificar">
          Verificar compra
        </Link>
      </div>
    )
  }

  const minutes = Math.ceil(remainingMs / 60000)
  const filteredAccounts = accounts.filter((a) => a.type === method)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!fileName) return
    setError('')
    try {
      await attachPayment(order.id, method, fileName)
      setDone(true)
    } catch {
      setError('No se pudo registrar el comprobante. Intenta de nuevo.')
    }
  }

  return (
    <div className="stack">
      <div className="section__head">
        <div>
          <span className="eyebrow">Orden {order.id}</span>
          <h1>Completa tu pago</h1>
          <p className="muted" style={{ margin: 0 }}>
            {order.buyer.fullName} · {order.buyer.phone}
          </p>
        </div>
        <span className={badgeClass(order.status)}>{statusLabel(order.status)}</span>
      </div>

      <div className="grid-2">
        <div className="stack">
          <div className="panel panel--pad stack">
            <h2>Tus boletos</h2>
            <div className="chip-row">
              {order.tickets.map((n) => (
                <span className="chip" key={n} style={{ background: 'rgba(255,79,163,.12)', color: 'var(--ink)' }}>
                  {formatTicket(n, raffle.digits)}
                </span>
              ))}
            </div>
            <p>
              Total a pagar: <strong>${order.total} MXN</strong>
            </p>
            {order.status === 'pending_payment' && (
              <div className="alert">
                Tiempo restante aproximado: {minutes} min. {site.paymentWarning}
              </div>
            )}
            {done || order.status === 'proof_uploaded' ? (
              <div className="alert alert--ok">
                Comprobante registrado. Validaremos tu pago pronto. También puedes{' '}
                <Link to="/verificar">verificar con tu teléfono</Link>.
              </div>
            ) : null}
          </div>

          {(order.status === 'pending_payment' || order.status === 'proof_uploaded') && (
            <form className="panel panel--pad form" onSubmit={onSubmit}>
              <h2>Subir comprobante</h2>
              <p className="muted" style={{ margin: 0 }}>
                Método: Mercado Pago
              </p>
              <div className="field">
                <label htmlFor="proof">Comprobante (imagen o PDF)</label>
                <input
                  id="proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                  required
                />
              </div>
              {error && <div className="alert">{error}</div>}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!fileName || order.status === 'proof_uploaded' || saving}
              >
                {saving ? 'Enviando…' : 'Enviar comprobante'}
              </button>
            </form>
          )}
        </div>

        <aside className="stack">
          {filteredAccounts.map((acc) => (
            <div className="account-card" key={acc.id}>
              <h3>{acc.bank}</h3>
              <div className="copy-row">
                <span className="muted">Titular</span> <strong>{acc.name}</strong>
              </div>
              {acc.card && (
                <div className="copy-row">
                  <span className="muted">Tarjeta</span> <strong>{acc.card}</strong>
                </div>
              )}
              {acc.note && (
                <p className="muted" style={{ marginBottom: 0 }}>
                  {acc.note}
                </p>
              )}
            </div>
          ))}
          <Link to="/pagos" className="btn btn--ghost">
            Ver cuenta de pago
          </Link>
        </aside>
      </div>
    </div>
  )
}
