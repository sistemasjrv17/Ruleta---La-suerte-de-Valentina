import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { activeRaffle, paymentAccounts, siteConfig } from '../data/mock'
import {
  apiAttachPayment,
  apiCreateOrder,
  apiUpdateStatus,
  apiVerifyByPhone,
  computeTaken,
  fetchBootstrap,
  isSheetsConfigured,
  normalizeOrder,
} from '../lib/sheetsApi'
import type {
  Buyer,
  Order,
  OrderStatus,
  PaymentAccount,
  PaymentMethodType,
  ProofUpload,
  Raffle,
  SiteConfig,
  TicketStatus,
} from '../types'

interface CartState {
  tickets: number[]
}

interface StoreValue {
  site: SiteConfig
  raffle: Raffle
  accounts: PaymentAccount[]
  orders: Order[]
  cart: CartState
  taken: Set<number>
  loading: boolean
  saving: boolean
  sheetsConnected: boolean
  error: string | null
  refresh: () => Promise<void>
  getTicketStatus: (n: number) => TicketStatus
  addTicket: (n: number) => boolean
  removeTicket: (n: number) => void
  clearCart: () => void
  /** Asigna exactamente `count` boletos al azar (reemplaza el carrito). Sin duplicados. */
  assignRandomTickets: (count: number) => { tickets: number[]; requested: number; ok: boolean }
  setCartTickets: (tickets: number[]) => void
  createOrder: (buyer: Buyer) => Promise<Order | null>
  attachPayment: (orderId: string, method: PaymentMethodType, proof: ProofUpload) => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  findOrdersByPhone: (phone: string) => Promise<Order[]>
  calcTotal: (count: number) => number
}

const StoreContext = createContext<StoreValue | null>(null)

function padTicket(n: number, digits: number) {
  return String(n).padStart(digits, '0')
}

export function formatTicket(n: number, digits?: number) {
  return padTicket(n, digits ?? activeRaffle.digits)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteConfig>(siteConfig)
  const [raffle, setRaffle] = useState<Raffle>(activeRaffle)
  const [accounts, setAccounts] = useState<PaymentAccount[]>(paymentAccounts)
  const [orders, setOrders] = useState<Order[]>([])
  const [cart, setCart] = useState<CartState>({ tickets: [] })
  const [taken, setTaken] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sheetsConnected, setSheetsConnected] = useState(isSheetsConfigured())
  const [error, setError] = useState<string | null>(null)
  const savingLock = useRef(false)

  const applyOrders = useCallback((nextOrders: Order[]) => {
    const normalized = nextOrders.map(normalizeOrder)
    setOrders(normalized)
    setTaken(new Set(computeTaken(normalized)))
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBootstrap()
      setSite(data.site)
      setRaffle(data.raffle)
      setAccounts(data.accounts)
      applyOrders(data.orders)
      setSheetsConnected(data.connected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información')
      setSheetsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [applyOrders])

  const softRefresh = useCallback(async () => {
    try {
      const data = await fetchBootstrap()
      setSite(data.site)
      setRaffle(data.raffle)
      setAccounts(data.accounts)
      applyOrders(data.orders)
      setSheetsConnected(data.connected)
    } catch {
      // Silencioso: no bloquea la UI si falla un refresh en segundo plano
    }
  }, [applyOrders])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const getTicketStatus = useCallback(
    (n: number): TicketStatus => {
      const paid = orders.some((o) => o.status === 'paid' && o.tickets.includes(n))
      if (paid) return 'paid'

      const reserved = orders.some(
        (o) =>
          (o.status === 'pending_payment' || o.status === 'proof_uploaded') &&
          o.tickets.includes(n) &&
          new Date(o.expiresAt).getTime() > Date.now(),
      )
      if (reserved || taken.has(n)) return 'reserved'
      return 'available'
    },
    [orders, taken],
  )

  const buildBlockedSet = useCallback(() => {
    const blocked = new Set<number>(taken)
    const now = Date.now()
    for (const o of orders) {
      if (o.status === 'paid') {
        o.tickets.forEach((t) => blocked.add(t))
        continue
      }
      if (
        (o.status === 'pending_payment' || o.status === 'proof_uploaded') &&
        (!o.expiresAt || new Date(o.expiresAt).getTime() > now)
      ) {
        o.tickets.forEach((t) => blocked.add(t))
      }
    }
    return blocked
  }, [orders, taken])

  const addTicket = (n: number) => {
    if (n < 0 || n >= raffle.totalTickets) return false
    if (getTicketStatus(n) !== 'available') return false
    if (cart.tickets.includes(n)) return false
    setCart((c) => ({ tickets: [...c.tickets, n].sort((a, b) => a - b) }))
    return true
  }

  const removeTicket = (n: number) => {
    setCart((c) => ({ tickets: c.tickets.filter((t) => t !== n) }))
  }

  const clearCart = () => setCart({ tickets: [] })

  const setCartTickets = (tickets: number[]) => {
    const unique = [...new Set(tickets.filter((n) => Number.isFinite(n) && n >= 0 && n < raffle.totalTickets))]
    setCart({ tickets: unique.sort((a, b) => a - b) })
  }

  /**
   * Elige exactamente `count` boletos disponibles al azar.
   * Reemplaza el carrito completo (no mezcla con selección previa).
   */
  const assignRandomTickets = useCallback(
    (count: number) => {
      const requested = Math.min(
        raffle.totalTickets,
        Math.max(0, Math.floor(Number(count) || 0)),
      )
      if (requested <= 0) {
        setCart({ tickets: [] })
        return { tickets: [] as number[], requested, ok: false }
      }

      const blocked = buildBlockedSet()
      const freeCount = raffle.totalTickets - blocked.size
      const take = Math.min(requested, Math.max(0, freeCount))

      if (take <= 0) {
        setCart({ tickets: [] })
        return { tickets: [] as number[], requested, ok: false }
      }

      const picked = new Set<number>()

      // Si hay muchos libres, muestreo por rechazo (rápido y sin duplicados)
      if (freeCount > take * 4) {
        let guard = 0
        const maxGuard = take * 40 + 200
        while (picked.size < take && guard < maxGuard) {
          guard++
          const n = Math.floor(Math.random() * raffle.totalTickets)
          if (blocked.has(n) || picked.has(n)) continue
          picked.add(n)
        }
      }

      // Fallback / completar: pool compacto Fisher–Yates
      if (picked.size < take) {
        const pool: number[] = []
        for (let i = 0; i < raffle.totalTickets; i++) {
          if (!blocked.has(i) && !picked.has(i)) pool.push(i)
        }
        const need = take - picked.size
        for (let i = 0; i < need; i++) {
          const j = i + Math.floor(Math.random() * (pool.length - i))
          const tmp = pool[i]
          pool[i] = pool[j]
          pool[j] = tmp
          picked.add(pool[i])
        }
      }

      const tickets = Array.from(picked).sort((a, b) => a - b)
      setCart({ tickets })
      return { tickets, requested, ok: tickets.length === requested }
    },
    [buildBlockedSet, raffle.totalTickets],
  )

  const calcTotal = (count: number) => {
    const pkg = [...raffle.packages].reverse().find((p) => p.amount === count)
    if (pkg) return pkg.price
    return count * raffle.ticketPrice
  }

  const beginSave = () => {
    if (savingLock.current) return false
    savingLock.current = true
    setSaving(true)
    setError(null)
    return true
  }

  const endSave = () => {
    savingLock.current = false
    setSaving(false)
  }

  const createOrder = async (buyer: Buyer): Promise<Order | null> => {
    if (!cart.tickets.length) return null
    if (!beginSave()) return null

    const ticketsSnapshot = [...cart.tickets]
    const total = calcTotal(ticketsSnapshot.length)

    try {
      const order = await apiCreateOrder({
        tickets: ticketsSnapshot,
        buyer,
        total,
      })
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)])
      setTaken((prev) => {
        const next = new Set(prev)
        order.tickets.forEach((t) => next.add(t))
        return next
      })
      setCart({ tickets: [] })
      return order
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la orden'
      setError(message)
      // Actualiza boletos ocupados si hubo conflicto
      void softRefresh()
      return null
    } finally {
      endSave()
    }
  }

  const attachPayment = async (orderId: string, method: PaymentMethodType, proof: ProofUpload) => {
    if (!proof.fileName || !proof.base64) {
      const msg = 'Debes subir el comprobante de pago'
      setError(msg)
      throw new Error(msg)
    }
    if (!beginSave()) return
    try {
      if (!isSheetsConfigured()) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  paymentMethod: method,
                  proofFileName: proof.fileName,
                  status: 'proof_uploaded' as const,
                }
              : o,
          ),
        )
        return
      }
      const order = await apiAttachPayment(orderId, method, proof)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el comprobante')
      throw err
    } finally {
      endSave()
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!beginSave()) return

    const previous = orders
    // Optimistic UI
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    setTaken(new Set(computeTaken(previous.map((o) => (o.id === orderId ? { ...o, status } : o)))))

    try {
      if (!isSheetsConfigured()) {
        return
      }
      const order = await apiUpdateStatus(orderId, status)
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? order : o))
        setTaken(new Set(computeTaken(next)))
        return next
      })
    } catch (err) {
      setOrders(previous)
      setTaken(new Set(computeTaken(previous)))
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado')
      throw err
    } finally {
      endSave()
    }
  }

  const findOrdersByPhone = async (phone: string) => {
    if (!isSheetsConfigured()) {
      const clean = phone.replace(/\D/g, '')
      return orders.filter((o) => {
        const p = o.buyer.phone.replace(/\D/g, '')
        return p === clean || p.endsWith(clean)
      })
    }
    return apiVerifyByPhone(phone)
  }

  const value = useMemo<StoreValue>(
    () => ({
      site,
      raffle,
      accounts,
      orders,
      cart,
      taken,
      loading,
      saving,
      sheetsConnected,
      error,
      refresh,
      getTicketStatus,
      addTicket,
      removeTicket,
      clearCart,
      assignRandomTickets,
      setCartTickets,
      createOrder,
      attachPayment,
      updateOrderStatus,
      findOrdersByPhone,
      calcTotal,
    }),
    [
      site,
      raffle,
      accounts,
      orders,
      cart,
      taken,
      loading,
      saving,
      sheetsConnected,
      error,
      refresh,
      getTicketStatus,
      assignRandomTickets,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
