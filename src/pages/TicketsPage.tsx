import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatTicket, useStore } from '../store/Store'

const PAGE_SIZE = 100

export function TicketsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const {
    raffle,
    cart,
    addTicket,
    removeTicket,
    clearCart,
    assignRandomTickets,
    getTicketStatus,
    calcTotal,
    loading,
  } = useStore()

  const packages = useMemo(
    () => raffle.packages.filter((p) => p.amount !== 2),
    [raffle.packages],
  )

  const initialQty = (() => {
    const q = Number(params.get('qty') || 5)
    if (!Number.isFinite(q) || q <= 0) return 5
    if (q === 2) return 5
    return Math.min(q, raffle.totalTickets)
  })()

  const [mode, setMode] = useState<'manual' | 'random'>(
    params.get('mode') === 'random' ? 'random' : 'manual',
  )
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState(initialQty)
  const [customQty, setCustomQty] = useState(String(initialQty))
  const [spinning, setSpinning] = useState(false)
  const [lastRandom, setLastRandom] = useState<number[]>([])
  const [pickError, setPickError] = useState('')
  const [autoDone, setAutoDone] = useState(false)

  const maxPage = Math.max(0, Math.ceil(raffle.totalTickets / PAGE_SIZE) - 1)

  const pageTickets = useMemo(() => {
    const start = page * PAGE_SIZE
    return Array.from({ length: Math.min(PAGE_SIZE, raffle.totalTickets - start) }, (_, i) => start + i)
  }, [page, raffle.totalTickets])

  const clampQty = (value: number) => {
    if (!Number.isFinite(value)) return 1
    return Math.min(raffle.totalTickets, Math.max(1, Math.floor(value)))
  }

  const runRandomAssign = (amount: number) => {
    const safe = clampQty(amount)
    const result = assignRandomTickets(safe)
    setQty(safe)
    setCustomQty(String(safe))
    setLastRandom(result.tickets)
    if (!result.ok) {
      setPickError(
        result.tickets.length === 0
          ? 'No hay boletos disponibles en este momento.'
          : `Solo hay ${result.tickets.length} de ${result.requested} boletos disponibles.`,
      )
    } else {
      setPickError('')
    }
    return result
  }

  useEffect(() => {
    if (autoDone || loading) return
    const q = Number(params.get('qty') || 0)
    if (params.get('mode') === 'random' && q > 0) {
      setMode('random')
      runRandomAssign(q === 2 ? 5 : q)
      setAutoDone(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, autoDone, loading])

  const pickRandom = (amount = qty) => {
    if (spinning) return
    const safe = clampQty(amount)
    setSpinning(true)
    setPickError('')
    window.setTimeout(() => {
      runRandomAssign(safe)
      setSpinning(false)
    }, 450)
  }

  const selectPackage = (amount: number) => {
    pickRandom(amount)
  }

  const assignCustomQty = () => {
    const parsed = Number(customQty)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setPickError('Escribe una cantidad válida (mínimo 1).')
      return
    }
    pickRandom(parsed)
  }

  const trySearch = () => {
    const n = Number(search)
    if (Number.isNaN(n) || n < 0 || n >= raffle.totalTickets) {
      setPickError(`Escribe un número entre 0 y ${raffle.totalTickets - 1}.`)
      return
    }
    setPage(Math.floor(n / PAGE_SIZE))
    const ok = addTicket(n)
    if (!ok) setPickError('Ese boleto no está disponible o ya lo tienes.')
    else setPickError('')
  }

  const total = calcTotal(cart.tickets.length)
  const uniqueTickets = useMemo(
    () => [...new Set(cart.tickets)].sort((a, b) => a - b),
    [cart.tickets],
  )
  const hasDupes = uniqueTickets.length !== cart.tickets.length
  const estimatedCustomTotal = clampQty(Number(customQty) || 0) * raffle.ticketPrice

  return (
    <div className="stack">
      <div className="section__head">
        <div>
          <span className="eyebrow">{raffle.name}</span>
          <h1>Elige tus boletos</h1>
          <p className="muted" style={{ margin: 0 }}>
            Selección manual o números al azar.
          </p>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'manual' ? 'is-active' : ''}
            onClick={() => {
              setMode('manual')
              setPickError('')
            }}
          >
            Uno por uno
          </button>
          <button
            type="button"
            className={mode === 'random' ? 'is-active' : ''}
            onClick={() => {
              setMode('random')
              setPickError('')
            }}
          >
            Al azar / ruleta
          </button>
        </div>
      </div>

      <div className="legend">
        <span>
          <i style={{ background: '#fff', border: '1px solid var(--line)' }} /> Disponible
        </span>
        <span>
          <i style={{ background: 'var(--pink)' }} /> Seleccionado
        </span>
        <span>
          <i style={{ background: '#fff7ed' }} /> Reservado
        </span>
        <span>
          <i style={{ background: '#eff6ff' }} /> Pagado
        </span>
      </div>

      {mode === 'random' ? (
        <div className="panel panel--pad stack">
          <h2>Ruleta de números</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Elige un paquete o escribe cuántos quieres: te damos exactamente esa cantidad al azar,
            sin repetir.
          </p>

          <div className="price-grid">
            {packages.map((p) => (
              <button
                key={p.amount}
                type="button"
                className={`price-card ${qty === p.amount ? 'is-active' : ''}`}
                onClick={() => selectPackage(p.amount)}
                disabled={spinning || loading}
              >
                <strong>{p.amount}</strong>
                <span>${p.price} MXN</span>
              </button>
            ))}
          </div>

          <div className="random-custom panel panel--pad">
            <div className="random-custom__row">
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label htmlFor="custom-qty">Cantidad manual</label>
                <input
                  id="custom-qty"
                  type="number"
                  min={1}
                  max={raffle.totalTickets}
                  inputMode="numeric"
                  value={customQty}
                  disabled={spinning || loading}
                  onChange={(e) => setCustomQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && assignCustomQty()}
                  placeholder="Ej. 7, 15, 33…"
                />
              </div>
              <div className="random-custom__actions">
                <span className="muted random-custom__price">
                  Total approx: <strong>${estimatedCustomTotal} MXN</strong>
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={assignCustomQty}
                  disabled={spinning || loading}
                >
                  Asignar al azar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn--gold"
              onClick={() => pickRandom(qty)}
              disabled={spinning || loading || qty < 1}
            >
              {spinning ? 'Girando…' : `Volver a girar (${qty})`}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clearCart()
                setLastRandom([])
                setPickError('')
              }}
              disabled={spinning}
            >
              Limpiar
            </button>
            {cart.tickets.length > 0 && (
              <span className="muted">
                Asignados: <strong>{cart.tickets.length}</strong>
                {qty !== cart.tickets.length ? ` (pediste ${qty})` : ' ✓'}
              </span>
            )}
          </div>

          {pickError && <div className="alert">{pickError}</div>}

          {lastRandom.length > 0 && (
            <div>
              <h3>Números asignados ({lastRandom.length})</h3>
              <div className="chip-row">
                {lastRandom.map((n) => (
                  <span
                    className="chip"
                    key={n}
                    style={{ background: 'rgba(255,79,163,.12)', color: 'var(--ink)' }}
                  >
                    {formatTicket(n, raffle.digits)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel panel--pad stack">
          <div className="form" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
            <div className="field">
              <label htmlFor="search">Buscar número</label>
              <input
                id="search"
                inputMode="numeric"
                placeholder={`0 - ${raffle.totalTickets - 1}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && trySearch()}
              />
            </div>
            <button type="button" className="btn btn--primary" onClick={trySearch}>
              Agregar
            </button>
          </div>
          {pickError && <div className="alert">{pickError}</div>}

          <div className="ticket-grid">
            {pageTickets.map((n) => {
              const status = getTicketStatus(n)
              const selected = cart.tickets.includes(n)
              const disabled = status !== 'available' && !selected
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  className={[
                    'ticket',
                    selected ? 'is-selected' : '',
                    status === 'reserved' ? 'is-reserved' : '',
                    status === 'paid' ? 'is-paid' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => (selected ? removeTicket(n) : addTicket(n))}
                >
                  {formatTicket(n, raffle.digits)}
                </button>
              )
            })}
          </div>

          <div className="pager">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span className="muted">
              Página {page + 1} / {maxPage + 1} · números {page * PAGE_SIZE}–
              {Math.min(raffle.totalTickets - 1, (page + 1) * PAGE_SIZE - 1)}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={page >= maxPage}
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {cart.tickets.length > 0 && (
        <div className="cart-dock">
          <div className="cart-dock__inner">
            <div className="stack" style={{ gap: '0.45rem', flex: 1 }}>
              <strong>
                {uniqueTickets.length} boleto{uniqueTickets.length === 1 ? '' : 's'} · ${total} MXN
              </strong>
              <div className="chip-row">
                {uniqueTickets.slice(0, 16).map((n) => (
                  <span className="chip" key={n}>
                    {formatTicket(n, raffle.digits)}
                    <button type="button" aria-label="Quitar" onClick={() => removeTicket(n)}>
                      ×
                    </button>
                  </span>
                ))}
                {uniqueTickets.length > 16 && (
                  <span className="chip">+{uniqueTickets.length - 16}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}
                onClick={() => {
                  clearCart()
                  setLastRandom([])
                }}
              >
                Vaciar
              </button>
              <button
                type="button"
                className="btn btn--gold"
                disabled={uniqueTickets.length === 0 || hasDupes || spinning}
                onClick={() => navigate('/checkout')}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="muted">
        ¿Ya apartaste? Ve a <Link to="/pagos">métodos de pago</Link> o{' '}
        <Link to="/verificar">verifica tu compra</Link>.
      </p>
    </div>
  )
}
