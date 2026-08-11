import { formatTicket, useStore } from '../store/Store'
import type { Order } from '../types'

function statusLabel(status: Order['status']) {
  const map: Record<Order['status'], string> = {
    pending_payment: 'Pendiente',
    proof_uploaded: 'Comprobante',
    paid: 'Pagado',
    expired: 'Expirado',
    rejected: 'Rechazado',
  }
  return map[status]
}

export function AdminPage() {
  const { orders, updateOrderStatus, raffle, refresh, loading, saving, error } = useStore()

  const pending = orders.filter((o) => o.status === 'pending_payment' || o.status === 'proof_uploaded')
  const paid = orders.filter((o) => o.status === 'paid')

  return (
    <div className="stack">
      <div className="section__head">
        <div>
          <span className="eyebrow">Panel</span>
          <h1>Gestión de órdenes</h1>
          <p className="muted">{raffle.name}: aprueba pagos o libera boletos.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="stat-row">
        <div className="stat panel" style={{ padding: '1rem' }}>
          <b>{orders.length}</b>
          <span className="muted">Órdenes</span>
        </div>
        <div className="stat panel" style={{ padding: '1rem' }}>
          <b>{pending.length}</b>
          <span className="muted">Por revisar</span>
        </div>
        <div className="stat panel" style={{ padding: '1rem' }}>
          <b>{paid.length}</b>
          <span className="muted">Pagadas</span>
        </div>
      </div>

      <div className="panel panel--pad table-wrap">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente</th>
              <th>Boletos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No hay órdenes todavía.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {order.proofFileName || 'Sin comprobante'}
                    </div>
                  </td>
                  <td>
                    {order.buyer.fullName}
                    <div className="muted">{order.buyer.phone}</div>
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    {order.tickets.length
                      ? order.tickets.map((n) => formatTicket(n, raffle.digits)).join(', ')
                      : '—'}
                  </td>
                  <td>${order.total}</td>
                  <td>{statusLabel(order.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={order.status === 'paid' || saving}
                        onClick={() => void updateOrderStatus(order.id, 'paid')}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={order.status === 'rejected' || order.status === 'expired' || saving}
                        onClick={() => void updateOrderStatus(order.id, 'rejected')}
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={saving}
                        onClick={() => void updateOrderStatus(order.id, 'expired')}
                      >
                        Liberar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
