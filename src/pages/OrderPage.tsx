import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'
import type { PaymentMethodType } from '../types'

const MAX_PROOF_BYTES = 4 * 1024 * 1024

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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export function OrderPage() {
  const { orderId } = useParams()
  const { orders, accounts, attachPayment, site, saving, raffle } = useStore()
  const order = orders.find((o) => o.id === orderId)
  const [file, setFile] = useState<File | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showAllTickets, setShowAllTickets] = useState(false)
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
  const previewCount = 24
  const sortedTickets = [...order.tickets].sort((a, b) => a - b)
  const visibleTickets = showAllTickets ? sortedTickets : sortedTickets.slice(0, previewCount)
  const hiddenCount = Math.max(0, sortedTickets.length - previewCount)
  const needsProof = order.status === 'pending_payment' && !done
  const proofDone = done || order.status === 'proof_uploaded' || Boolean(order.proofFileName)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Debes seleccionar tu comprobante de pago')
      return
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError('El comprobante pesa demasiado (máximo 4 MB)')
      return
    }
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isImage && !isPdf) {
      setError('Solo se permiten imágenes o PDF')
      return
    }

    setError('')
    try {
      const base64 = await readFileAsBase64(file)
      await attachPayment(order.id, method, {
        fileName: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        base64,
      })
      setDone(true)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el comprobante. Intenta de nuevo.')
    }
  }

  return (
    <div className="stack checkout">
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

      <div className="checkout__layout">
        <div className="stack">
          <div className="panel panel--pad stack">
            <h2>Tus boletos ({order.tickets.length})</h2>
            <p style={{ margin: 0 }}>
              Total a pagar: <strong>${order.total} MXN</strong>
            </p>
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
                className="btn btn--ghost btn--sm"
                onClick={() => setShowAllTickets((v) => !v)}
              >
                {showAllTickets ? 'Ver menos' : `Ver los ${sortedTickets.length} boletos`}
              </button>
            )}
            {needsProof && (
              <div className="alert">
                Paso obligatorio: paga y sube tu comprobante. Tiempo restante aproximado: {minutes}{' '}
                min. {site.paymentWarning}
              </div>
            )}
            {proofDone ? (
              <div className="alert alert--ok">
                Comprobante registrado. Validaremos tu pago pronto. También puedes{' '}
                <Link to="/verificar">verificar con tu teléfono</Link>.
              </div>
            ) : null}
          </div>

          {needsProof && (
            <form className="panel panel--pad form" onSubmit={onSubmit}>
              <h2>Comprobante de pago (obligatorio)</h2>
              <p className="muted" style={{ margin: 0 }}>
                Sin comprobante no se puede validar tu compra. Imagen o PDF, máximo 4 MB.
              </p>
              <div className="field">
                <label htmlFor="proof">Adjuntar comprobante</label>
                <input
                  id="proof"
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  required
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    setError('')
                  }}
                />
                {file && (
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Archivo: {file.name}
                  </p>
                )}
              </div>
              {error && <div className="alert">{error}</div>}
              <button type="submit" className="btn btn--primary" disabled={!file || saving}>
                {saving ? 'Enviando comprobante…' : 'Enviar comprobante'}
              </button>
            </form>
          )}

          {order.status === 'proof_uploaded' && order.proofFileName && (
            <div className="panel panel--pad">
              <p style={{ margin: 0 }}>
                Comprobante enviado: <strong>{order.proofFileName}</strong>
              </p>
            </div>
          )}
        </div>

        <aside className="stack">
          {filteredAccounts.map((acc) => (
            <div className="account-card panel panel--pad" key={acc.id}>
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
